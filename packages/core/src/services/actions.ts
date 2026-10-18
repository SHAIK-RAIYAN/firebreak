import { eq, and, inArray, sql, desc, asc, lt } from "drizzle-orm";
import { db as defaultDb, type Database } from "../db/client.js";
import {
  incidents,
  services,
  actions,
  probes,
  suspects,
  analyses,
  timeline_events,
  type DeploymentRef,
  type PreflightCheck,
  type SuspectFile,
  type Evidence,
  type Severity,
} from "../db/schema.js";
import { type ServiceContext } from "./context.js";
import { getVercelClientForWorkspace } from "./integrations.js";
import { probe } from "../adapters/probe.js";
import { evaluatePreflight } from "../domain/preflight.js";
import { AppError } from "../domain/errors.js";
import { newId } from "../util/ids.js";
import { now } from "../util/time.js";
import { logger } from "../util/logger.js";
import { withRetry } from "../util/retry.js";
import { recordTimelineEvent } from "./timeline.js";
import { inngest } from "../inngest/client.js";
import type {
  ActionStatusView,
  IncidentDetail,
  IncidentListItem,
  SuspectView,
  ProbeView,
  TimelineEventView,
  AnalysisView,
  IncidentCard,
} from "../views/types.js";
import type { IncidentStatus, ActionStatus as ActionStatusEnum } from "../domain/state.js";
import type { Analysis } from "../ai/schema.js";

export const ACTION_APPROVAL_TTL_MIN = 15;
export const VERIFY_REQUIRED_STREAK = parseInt(process.env.VERIFY_REQUIRED_STREAK ?? "3", 10);
export const VERIFY_MAX_PROBES = parseInt(process.env.VERIFY_MAX_PROBES ?? "18", 10);
export const VERIFY_INTERVAL_S = parseInt(process.env.VERIFY_INTERVAL_S ?? "10", 10);

export type ActionRow = typeof actions.$inferSelect;

export type ProposeRollbackResult = {
  action: ActionRow;
  proposed: boolean;
  existing?: boolean;
};

export async function proposeRollback(
  ctx: ServiceContext,
  incidentId: string,
  proposedByUserId?: string | null,
  customDb?: Database,
): Promise<ProposeRollbackResult> {
  const db = customDb ?? defaultDb();

  // 1. Idempotency: check if incident already has a live action
  const liveStatuses = ["proposed", "awaiting_approval", "approved", "executing", "verifying"] as const;
  const [existingLiveAction] = await db
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.incident_id, incidentId),
        eq(actions.workspace_id, ctx.workspaceId),
        inArray(actions.status, liveStatuses as unknown as string[]),
      ),
    )
    .limit(1);

  if (existingLiveAction) {
    return {
      action: existingLiveAction,
      proposed: false,
      existing: true,
    };
  }

  // Load incident
  const [incident] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!incident) {
    throw new AppError("NOT_FOUND", 404, "Incident not found");
  }

  // Incident must be in 'triaged' or 'mitigation_failed' and have good_deployment
  if (incident.status !== "triaged" && incident.status !== "mitigation_failed") {
    throw new AppError(
      "CONFLICT",
      409,
      `Cannot propose rollback: incident status is '${incident.status}', expected 'triaged' or 'mitigation_failed'`,
      { reason: "INVALID_STATE", currentStatus: incident.status },
    );
  }

  const targetDeploymentRef = incident.good_deployment as DeploymentRef | null;
  if (!targetDeploymentRef || !targetDeploymentRef.id) {
    throw new AppError("CONFLICT", 409, "Cannot propose rollback: no rollback target found", {
      reason: "NO_ROLLBACK_TARGET",
    });
  }

  // Load service
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, incident.service_id), eq(services.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!service) {
    throw new AppError("NOT_FOUND", 404, "Service not found");
  }

  // 2. Fetch fresh current production and fresh target deployment from Vercel
  const vercel = await getVercelClientForWorkspace(ctx);
  const current = await vercel.getCurrentProduction(service.vercel_project_id);
  const freshTarget = await vercel.getDeployment(targetDeploymentRef.id);

  // Probe health URL if configured (8s timeout)
  let latestProbeResult = null;
  if (service.health_url) {
    latestProbeResult = await probe(service.health_url, {
      expectedStatus: service.health_expected_status ?? 200,
      timeoutMs: 8000,
    });
  }

  // Known bad deployment IDs from earlier incidents
  const earlierIncidents = await db
    .select({ badDeployment: incidents.bad_deployment })
    .from(incidents)
    .where(
      and(
        eq(incidents.service_id, service.id),
        sql`${incidents.id} != ${incident.id} and ${incidents.bad_deployment} is not null`,
      ),
    );

  const knownBadIds = earlierIncidents
    .map((r) => (r.badDeployment as DeploymentRef | null)?.id)
    .filter((id): id is string => Boolean(id));

  // 3. Evaluate preflight checks
  const currentTime = now();
  const expiresAt = new Date(currentTime.getTime() + ACTION_APPROVAL_TTL_MIN * 60 * 1000);

  const checks = evaluatePreflight({
    target: freshTarget,
    current,
    from: current,
    knownBadIds,
    now: currentTime,
    expiresAt,
    latestProbe: latestProbeResult
      ? {
          ok: latestProbeResult.ok,
          httpStatus: latestProbeResult.httpStatus,
          latencyMs: latestProbeResult.latencyMs,
          observedSha: latestProbeResult.observedSha,
          error: latestProbeResult.error,
        }
      : null,
  });

  const canExecute = checks.filter((c) => c.blocking).every((c) => c.ok);
  const actionId = newId("act");

  // 4. If blocking failure, record cancelled action and return
  if (!canExecute) {
    const failingCheck = checks.find((c) => c.blocking && !c.ok);
    const [cancelledAction] = await db
      .insert(actions)
      .values({
        id: actionId,
        workspace_id: ctx.workspaceId,
        incident_id: incident.id,
        service_id: service.id,
        type: "rollback",
        status: "cancelled",
        error_code: "preflight_failed",
        error_message: failingCheck?.detail ?? "Preflight check failed",
        proposed_by: proposedByUserId ? "user" : "system",
        from_deployment: current,
        target_deployment: freshTarget,
        preflight: checks,
        proposed_at: currentTime,
        expires_at: expiresAt,
      })
      .returning();

    if (!cancelledAction) {
      throw new AppError("INTERNAL", 500, "Failed to insert cancelled action");
    }

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: incident.id,
      type: "preflight_failed",
      summary: `Preflight check failed: ${failingCheck?.detail ?? "unknown"}`,
      data: { checks, actionId },
    });

    return {
      action: cancelledAction,
      proposed: false,
    };
  }

  // 5. Insert action awaiting_approval
  let createdAction: ActionRow;
  try {
    const [act] = await db
      .insert(actions)
      .values({
        id: actionId,
        workspace_id: ctx.workspaceId,
        incident_id: incident.id,
        service_id: service.id,
        type: "rollback",
        status: "awaiting_approval",
        proposed_by: proposedByUserId ? "user" : "system",
        from_deployment: current,
        target_deployment: freshTarget,
        preflight: checks,
        proposed_at: currentTime,
        expires_at: expiresAt,
      })
      .returning();

    if (!act) {
      throw new AppError("INTERNAL", 500, "Failed to insert proposed action");
    }
    createdAction = act;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error?.code === "23505" || error?.message?.includes("unique")) {
      const [existing] = await db
        .select()
        .from(actions)
        .where(
          and(
            eq(actions.incident_id, incident.id),
            eq(actions.workspace_id, ctx.workspaceId),
            inArray(actions.status, liveStatuses as unknown as string[]),
          ),
        )
        .limit(1);

      if (existing) {
        return { action: existing, proposed: false, existing: true };
      }
    }
    throw err;
  }

  // 6. Transition incident status to awaiting_approval
  await db
    .update(incidents)
    .set({
      status: "awaiting_approval",
      updated_at: now(),
    })
    .where(
      and(
        eq(incidents.id, incident.id),
        eq(incidents.workspace_id, ctx.workspaceId),
        inArray(incidents.status, ["triaged", "mitigation_failed"]),
      ),
    );

  const targetShaShort = freshTarget.sha ? freshTarget.sha.slice(0, 7) : freshTarget.id;
  await recordTimelineEvent(db, {
    workspaceId: ctx.workspaceId,
    incidentId: incident.id,
    type: "action_proposed",
    summary: `Proposed rollback to ${targetShaShort}`,
    data: {
      actionId: createdAction.id,
      targetDeploymentId: freshTarget.id,
      targetSha: freshTarget.sha,
      expiresAt: expiresAt.toISOString(),
    },
  });

  // 7. Dispatch action/proposed to Inngest for expiry timer
  try {
    await inngest.send({
      name: "action/proposed",
      data: {
        actionId: createdAction.id,
        workspaceId: ctx.workspaceId,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error(
      { err, actionId: createdAction.id },
      "Failed to dispatch Inngest event action/proposed",
    );
  }

  return {
    action: createdAction,
    proposed: true,
  };
}

export async function approveAction(
  ctx: ServiceContext,
  actionId: string,
  input: { note?: string | null; via?: "web" | "mcp" } = {},
  customDb?: Database,
): Promise<ActionRow> {
  const via = input.via ?? (ctx.actorType === "mcp" ? "mcp" : "web");

  // 1. If via mcp, check actions:approve scope
  if (via === "mcp") {
    if (!ctx.identity?.scopes.includes("actions:approve")) {
      throw new AppError("FORBIDDEN", 403, "MCP key lacks 'actions:approve' scope", {
        reason: "MISSING_SCOPE",
      });
    }
  }

  const db = customDb ?? defaultDb();
  const currentTime = now();

  // 2. CAS update: status='awaiting_approval' and expires_at > now() -> 'approved'
  const [updatedAction] = await db
    .update(actions)
    .set({
      status: "approved",
      decided_by_user_id: ctx.userId ?? ctx.identity?.keyId ?? "system",
      decided_via: via,
      decided_at: currentTime,
      decision_note: input.note ?? null,
      updated_at: currentTime,
    })
    .where(
      and(
        eq(actions.id, actionId),
        eq(actions.workspace_id, ctx.workspaceId),
        eq(actions.status, "awaiting_approval"),
        sql`${actions.expires_at} > ${currentTime}`,
      ),
    )
    .returning();

  // 3. If 0 rows updated, inspect reason
  if (!updatedAction) {
    const [existing] = await db
      .select()
      .from(actions)
      .where(and(eq(actions.id, actionId), eq(actions.workspace_id, ctx.workspaceId)))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", 404, "Action not found");
    }

    if (existing.status === "awaiting_approval" && existing.expires_at <= currentTime) {
      // Mark action expired and incident back to triaged
      await db
        .update(actions)
        .set({ status: "expired", updated_at: currentTime })
        .where(
          and(
            eq(actions.id, actionId),
            eq(actions.workspace_id, ctx.workspaceId),
            eq(actions.status, "awaiting_approval"),
          ),
        );

      await db
        .update(incidents)
        .set({ status: "triaged", updated_at: currentTime })
        .where(
          and(
            eq(incidents.id, existing.incident_id),
            eq(incidents.workspace_id, ctx.workspaceId),
            eq(incidents.status, "awaiting_approval"),
          ),
        );

      await recordTimelineEvent(db, {
        workspaceId: ctx.workspaceId,
        incidentId: existing.incident_id,
        type: "action_expired",
        actorType: "system",
        summary: "Action expired before decision",
        data: { actionId },
      });

      throw new AppError("PRECONDITION_FAILED", 412, "Action has expired", {
        reason: "ACTION_EXPIRED",
      });
    }

    throw new AppError("CONFLICT", 409, `Action cannot be approved: current status is '${existing.status}'`, {
      reason: "INVALID_STATE",
      currentStatus: existing.status,
    });
  }

  // 4. Transition incident awaiting_approval -> mitigating
  await db
    .update(incidents)
    .set({
      status: "mitigating",
      updated_at: currentTime,
    })
    .where(
      and(
        eq(incidents.id, updatedAction.incident_id),
        eq(incidents.workspace_id, ctx.workspaceId),
        eq(incidents.status, "awaiting_approval"),
      ),
    );

  await recordTimelineEvent(db, {
    workspaceId: ctx.workspaceId,
    incidentId: updatedAction.incident_id,
    type: "action_approved",
    actorType: ctx.actorType,
    actorId: ctx.userId ?? ctx.identity?.keyId ?? null,
    summary: `Rollback approved via ${via}${input.note ? `: ${input.note}` : ""}`,
    data: {
      actionId: updatedAction.id,
      decidedVia: via,
      note: input.note,
    },
  });

  // 5. Send action/approved to Inngest with retry
  try {
    await withRetry(
      async () => {
        await inngest.send({
          name: "action/approved",
          data: {
            actionId: updatedAction.id,
            workspaceId: ctx.workspaceId,
          },
        });
      },
      { retries: 3, baseMs: 300, maxMs: 1500 },
    );
  } catch (dispatchErr) {
    logger.error(
      { err: dispatchErr, actionId: updatedAction.id },
      "Failed to dispatch Inngest event action/approved, rolling back CAS",
    );

    // Rollback CAS
    await db
      .update(actions)
      .set({ status: "awaiting_approval", updated_at: now() })
      .where(and(eq(actions.id, updatedAction.id), eq(actions.status, "approved")));

    await db
      .update(incidents)
      .set({ status: "awaiting_approval", updated_at: now() })
      .where(and(eq(incidents.id, updatedAction.incident_id), eq(incidents.status, "mitigating")));

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: updatedAction.incident_id,
      type: "approval_dispatch_failed",
      actorType: "system",
      summary: "Could not start execution, dispatch failed",
      data: { actionId: updatedAction.id },
    });

    throw new AppError("UPSTREAM_ERROR", 502, "Could not start execution, please try again", {
      reason: "DISPATCH_FAILED",
    });
  }

  return updatedAction;
}

export async function rejectAction(
  ctx: ServiceContext,
  actionId: string,
  input: { note?: string | null } = {},
  customDb?: Database,
): Promise<ActionRow> {
  const db = customDb ?? defaultDb();
  const currentTime = now();
  const via = ctx.actorType === "mcp" ? "mcp" : "web";

  const [rejectedAction] = await db
    .update(actions)
    .set({
      status: "rejected",
      decided_by_user_id: ctx.userId ?? ctx.identity?.keyId ?? "system",
      decided_via: via,
      decided_at: currentTime,
      decision_note: input.note ?? null,
      updated_at: currentTime,
    })
    .where(
      and(
        eq(actions.id, actionId),
        eq(actions.workspace_id, ctx.workspaceId),
        eq(actions.status, "awaiting_approval"),
      ),
    )
    .returning();

  if (!rejectedAction) {
    const [existing] = await db
      .select()
      .from(actions)
      .where(and(eq(actions.id, actionId), eq(actions.workspace_id, ctx.workspaceId)))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", 404, "Action not found");
    }

    throw new AppError("CONFLICT", 409, `Action cannot be rejected: current status is '${existing.status}'`, {
      reason: "INVALID_STATE",
      currentStatus: existing.status,
    });
  }

  // Transition incident awaiting_approval -> triaged
  await db
    .update(incidents)
    .set({
      status: "triaged",
      updated_at: currentTime,
    })
    .where(
      and(
        eq(incidents.id, rejectedAction.incident_id),
        eq(incidents.workspace_id, ctx.workspaceId),
        eq(incidents.status, "awaiting_approval"),
      ),
    );

  await recordTimelineEvent(db, {
    workspaceId: ctx.workspaceId,
    incidentId: rejectedAction.incident_id,
    type: "action_rejected",
    actorType: ctx.actorType,
    actorId: ctx.userId ?? ctx.identity?.keyId ?? null,
    summary: `Rollback rejected by user${input.note ? `: ${input.note}` : ""}`,
    data: {
      actionId: rejectedAction.id,
      note: input.note,
    },
  });

  return rejectedAction;
}

export async function executeAction(
  ctx: ServiceContext,
  actionId: string,
  customDb?: Database,
): Promise<{ stop: boolean }> {
  const db = customDb ?? defaultDb();

  const [action] = await db
    .select()
    .from(actions)
    .where(and(eq(actions.id, actionId), eq(actions.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!action) {
    throw new AppError("NOT_FOUND", 404, "Action not found");
  }

  const [incident] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, action.incident_id), eq(incidents.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!incident) {
    throw new AppError("NOT_FOUND", 404, "Incident not found");
  }

  // 1. Idempotent check
  const nonExecutingStatuses = [
    "verifying",
    "verified",
    "verification_failed",
    "failed",
    "cancelled",
    "rejected",
    "expired",
  ];
  if (nonExecutingStatuses.includes(action.status)) {
    return { stop: action.status !== "verifying" };
  }

  // 2. Incident terminal check
  if (incident.status === "resolved" || incident.status === "dismissed") {
    if (!action.vercel_response) {
      await db
        .update(actions)
        .set({ status: "cancelled", error_code: "incident_closed", updated_at: now() })
        .where(
          and(
            eq(actions.id, action.id),
            eq(actions.workspace_id, ctx.workspaceId),
            inArray(actions.status, ["approved", "executing"]),
          ),
        );
      await recordTimelineEvent(db, {
        workspaceId: ctx.workspaceId,
        incidentId: incident.id,
        type: "action_cancelled",
        actorType: "system",
        summary: "Incident was closed, action cancelled",
        data: { actionId: action.id },
      });
    }
    return { stop: true };
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, action.service_id), eq(services.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!service) {
    throw new AppError("NOT_FOUND", 404, "Service not found");
  }

  const vercel = await getVercelClientForWorkspace(ctx);

  // 3. Preflight re-check on approved
  if (action.status === "approved") {
    const current = await vercel.getCurrentProduction(service.vercel_project_id);
    const target = action.target_deployment as DeploymentRef;
    const from = action.from_deployment as DeploymentRef;

    const currentTime = now();
    const decidedAt = action.decided_at ?? currentTime;
    const graceExpiry = new Date(decidedAt.getTime() + 2 * 60 * 1000);

    const checks = evaluatePreflight({
      target,
      current,
      from,
      knownBadIds: [],
      now: currentTime,
      expiresAt: graceExpiry,
      latestProbe: null,
    });

    const failingCheck = checks.find((c) => c.blocking && !c.ok);
    if (failingCheck) {
      await db
        .update(actions)
        .set({
          status: "cancelled",
          error_code: failingCheck.id,
          error_message: failingCheck.detail,
          updated_at: currentTime,
        })
        .where(
          and(
            eq(actions.id, action.id),
            eq(actions.workspace_id, ctx.workspaceId),
            eq(actions.status, "approved"),
          ),
        );

      await db
        .update(incidents)
        .set({ status: "triaged", updated_at: currentTime })
        .where(
          and(
            eq(incidents.id, incident.id),
            eq(incidents.workspace_id, ctx.workspaceId),
            eq(incidents.status, "mitigating"),
          ),
        );

      await recordTimelineEvent(db, {
        workspaceId: ctx.workspaceId,
        incidentId: incident.id,
        type: "action_cancelled",
        actorType: "system",
        summary: "Production changed since approval — cancelled. Re-propose to continue.",
        data: { actionId: action.id, failingCheck },
      });

      return { stop: true };
    }

    // Transition approved -> executing
    await db
      .update(actions)
      .set({
        status: "executing",
        execution_started_at: currentTime,
        updated_at: currentTime,
      })
      .where(
        and(
          eq(actions.id, action.id),
          eq(actions.workspace_id, ctx.workspaceId),
          eq(actions.status, "approved"),
        ),
      );

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: incident.id,
      type: "action_executing",
      actorType: "system",
      summary: "Rollback execution started on Vercel",
      data: { actionId: action.id },
    });
  }

  // 4. If status is executing: check idempotency first
  if (action.vercel_response) {
    return { stop: false };
  }

  const target = action.target_deployment as DeploymentRef;
  const aliasJob = await vercel.getAliasJob(service.vercel_project_id);
  const requestedAtMs = typeof aliasJob?.requestedAt === "number" ? aliasJob.requestedAt : 0;
  if (
    aliasJob &&
    aliasJob.type === "rollback" &&
    aliasJob.toDeploymentId === target.id &&
    requestedAtMs >=
      (action.execution_started_at?.getTime() ?? action.created_at.getTime())
  ) {
    await db
      .update(actions)
      .set({
        vercel_response: { inferred: true, toDeploymentId: aliasJob.toDeploymentId },
        updated_at: now(),
      })
      .where(eq(actions.id, action.id));
    return { stop: false };
  }

  // 5. Execute rollback call on Vercel
  try {
    const result = await vercel.rollback(
      service.vercel_project_id,
      target.id,
      `Firebreak INC-${incident.number}: ${incident.title}`,
    );

    const executedAt = now();
    await db
      .update(actions)
      .set({
        vercel_response: result.body,
        executed_at: executedAt,
        updated_at: executedAt,
      })
      .where(eq(actions.id, action.id));

    const targetSha = target.sha ? target.sha.slice(0, 7) : target.id;
    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: incident.id,
      type: "action_executed",
      actorType: "system",
      summary: `Vercel rollback requested for ${targetSha}`,
      data: { actionId: action.id, targetDeploymentId: target.id },
    });

    return { stop: false };
  } catch (err: unknown) {
    const error = err as AppError;
    const errorCode = error.details?.reason ?? error.code ?? "VERCEL_ERROR";
    const errorMessage = error.message;

    if (errorCode === "VERCEL_CONFLICT") {
      // Retriable
      throw err;
    }

    // Fatal / non-retriable: mark failed
    await db
      .update(actions)
      .set({
        status: "failed",
        error_code: String(errorCode),
        error_message: errorMessage,
        updated_at: now(),
      })
      .where(
        and(
          eq(actions.id, action.id),
          eq(actions.workspace_id, ctx.workspaceId),
          eq(actions.status, "executing"),
        ),
      );

    await db
      .update(incidents)
      .set({ status: "mitigation_failed", updated_at: now() })
      .where(
        and(
          eq(incidents.id, incident.id),
          eq(incidents.workspace_id, ctx.workspaceId),
          eq(incidents.status, "mitigating"),
        ),
      );

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: incident.id,
      type: "action_failed",
      actorType: "system",
      summary: `Rollback execution failed: ${errorMessage}`,
      data: { actionId: action.id, errorCode, errorMessage },
    });

    throw err;
  }
}

export async function confirmProduction(
  ctx: ServiceContext,
  actionId: string,
  customDb?: Database,
): Promise<{ stop: boolean }> {
  const db = customDb ?? defaultDb();

  const [action] = await db
    .select()
    .from(actions)
    .where(and(eq(actions.id, actionId), eq(actions.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!action) {
    throw new AppError("NOT_FOUND", 404, "Action not found");
  }

  if (action.status === "verifying") {
    return { stop: false };
  }

  const terminalStatuses = ["failed", "cancelled", "rejected", "expired", "verified", "verification_failed"];
  if (terminalStatuses.includes(action.status)) {
    return { stop: true };
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, action.service_id), eq(services.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!service) {
    throw new AppError("NOT_FOUND", 404, "Service not found");
  }

  const vercel = await getVercelClientForWorkspace(ctx);
  const target = action.target_deployment as DeploymentRef;

  // Poll alias job or current production up to 45 s every 3 s (15 iterations)
  const maxAttempts = 15;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentProd = await vercel.getCurrentProduction(service.vercel_project_id);
    if (currentProd.id === target.id) {
      const verifyStartedAt = now();
      await db
        .update(actions)
        .set({
          status: "verifying",
          verify_started_at: verifyStartedAt,
          updated_at: verifyStartedAt,
        })
        .where(and(eq(actions.id, action.id), eq(actions.status, "executing")));

      await db
        .update(incidents)
        .set({ status: "verifying", updated_at: verifyStartedAt })
        .where(and(eq(incidents.id, action.incident_id), eq(incidents.status, "mitigating")));

      const targetSha = target.sha ? target.sha.slice(0, 7) : target.id;
      await recordTimelineEvent(db, {
        workspaceId: ctx.workspaceId,
        incidentId: action.incident_id,
        type: "production_confirmed",
        actorType: "system",
        summary: `Vercel now serves ${targetSha}`,
        data: { actionId: action.id, targetDeploymentId: target.id, targetSha },
      });

      return { stop: false };
    }

    const job = await vercel.getAliasJob(service.vercel_project_id);

    if (job && job.type === "rollback" && job.toDeploymentId === target.id) {
      if (job.jobStatus === "failed") {
        await db
          .update(actions)
          .set({
            status: "failed",
            error_code: "vercel_job_failed",
            error_message: "Vercel alias rollback job reported failure",
            updated_at: now(),
          })
          .where(and(eq(actions.id, action.id), eq(actions.status, "executing")));

        await db
          .update(incidents)
          .set({ status: "mitigation_failed", updated_at: now() })
          .where(and(eq(incidents.id, action.incident_id), eq(incidents.status, "mitigating")));

        await recordTimelineEvent(db, {
          workspaceId: ctx.workspaceId,
          incidentId: action.incident_id,
          type: "action_failed",
          actorType: "system",
          summary: "Vercel rollback alias job failed",
          data: { actionId: action.id, toDeploymentId: job.toDeploymentId },
        });

        return { stop: true };
      }
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Not done in 45s: throw retriable error
  throw new AppError("UPSTREAM_ERROR", 502, "Timed out waiting for Vercel production alias job", {
    reason: "VERCEL_CONFIRM_PENDING",
  });
}

export async function recordProbe(
  ctx: ServiceContext,
  actionId: string,
  seq: number,
  customDb?: Database,
): Promise<{ ok: boolean; streak: number }> {
  const db = customDb ?? defaultDb();

  // 1. Idempotency check: if probe with (action_id, seq) already exists, return it
  const [existingProbe] = await db
    .select()
    .from(probes)
    .where(and(eq(probes.action_id, actionId), eq(probes.seq, seq)))
    .limit(1);

  if (existingProbe) {
    const allProbes = await db
      .select()
      .from(probes)
      .where(eq(probes.action_id, actionId))
      .orderBy(asc(probes.seq));

    let streak = 0;
    for (const p of allProbes) {
      if (p.seq > seq) break;
      streak = p.ok ? streak + 1 : 0;
    }
    return { ok: existingProbe.ok, streak };
  }

  const [action] = await db
    .select()
    .from(actions)
    .where(and(eq(actions.id, actionId), eq(actions.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!action) {
    throw new AppError("NOT_FOUND", 404, "Action not found");
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, action.service_id), eq(services.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!service) {
    throw new AppError("NOT_FOUND", 404, "Service not found");
  }

  const target = action.target_deployment as DeploymentRef;
  const probeResult = await probe(service.health_url, {
    expectedStatus: service.health_expected_status ?? 200,
    timeoutMs: 8000,
  });

  let ok = probeResult.ok;
  if (probeResult.observedSha && target.sha) {
    const shaMatches =
      probeResult.observedSha.startsWith(target.sha.slice(0, 7)) ||
      target.sha.startsWith(probeResult.observedSha);
    if (!shaMatches) {
      ok = false;
    }
  }

  const probeId = newId("prb");
  const probeAt = now();

  const [insertedProbe] = await db
    .insert(probes)
    .values({
      id: probeId,
      workspace_id: ctx.workspaceId,
      action_id: actionId,
      seq,
      at: probeAt,
      http_status: probeResult.httpStatus,
      ok,
      latency_ms: probeResult.latencyMs,
      observed_sha: probeResult.observedSha,
      error: probeResult.error,
    })
    .returning();

  if (!insertedProbe) {
    throw new AppError("INTERNAL", 500, "Failed to insert probe result");
  }

  // Compute streak
  const allProbes = await db
    .select()
    .from(probes)
    .where(eq(probes.action_id, actionId))
    .orderBy(asc(probes.seq));

  let streak = 0;
  let previousOk: boolean | null = null;
  for (const p of allProbes) {
    if (p.seq === seq - 1) previousOk = p.ok;
    streak = p.ok ? streak + 1 : 0;
  }

  // Timeline: only when ok-state flips or seq = 1
  if (seq === 1 || (previousOk !== null && previousOk !== ok)) {
    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: action.incident_id,
      type: "probe",
      actorType: "system",
      summary: `Health probe #${seq}: ${ok ? "healthy" : "failing"} (${probeResult.latencyMs ?? 0}ms)`,
      data: {
        actionId,
        seq,
        ok,
        httpStatus: probeResult.httpStatus,
        latencyMs: probeResult.latencyMs,
        observedSha: probeResult.observedSha,
        streak,
      },
    });
  }

  return { ok, streak };
}

export async function finishVerification(
  ctx: ServiceContext,
  actionId: string,
  verified: boolean,
  customDb?: Database,
): Promise<void> {
  const db = customDb ?? defaultDb();
  const currentTime = now();

  const [action] = await db
    .select()
    .from(actions)
    .where(and(eq(actions.id, actionId), eq(actions.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!action) {
    throw new AppError("NOT_FOUND", 404, "Action not found");
  }

  if (verified) {
    await db
      .update(actions)
      .set({
        status: "verified",
        verify_finished_at: currentTime,
        updated_at: currentTime,
      })
      .where(and(eq(actions.id, action.id), eq(actions.status, "verifying")));

    await db
      .update(incidents)
      .set({
        status: "resolved",
        closed_reason: "verified",
        resolved_at: currentTime,
        updated_at: currentTime,
      })
      .where(and(eq(incidents.id, action.incident_id), eq(incidents.status, "verifying")));

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: action.incident_id,
      type: "verified",
      actorType: "system",
      summary: "Verification succeeded: 3 healthy checks in a row",
      data: { actionId: action.id },
    });

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: action.incident_id,
      type: "incident_resolved",
      actorType: "system",
      summary: "Incident resolved: service verified recovered",
      data: { actionId: action.id, reason: "verified" },
    });
  } else {
    await db
      .update(actions)
      .set({
        status: "verification_failed",
        updated_at: currentTime,
      })
      .where(and(eq(actions.id, action.id), eq(actions.status, "verifying")));

    await db
      .update(incidents)
      .set({
        status: "mitigation_failed",
        updated_at: currentTime,
      })
      .where(and(eq(incidents.id, action.incident_id), eq(incidents.status, "verifying")));

    const target = action.target_deployment as DeploymentRef;
    const targetSha = target.sha ? target.sha.slice(0, 7) : target.id;
    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: action.incident_id,
      type: "verification_failed",
      actorType: "system",
      summary: `Verification failed after 3 minutes. Production is on ${targetSha}. Investigate manually.`,
      data: { actionId: action.id, targetSha },
    });
  }
}

export async function expireAction(
  ctx: ServiceContext,
  actionId: string,
  customDb?: Database,
): Promise<void> {
  const db = customDb ?? defaultDb();
  const currentTime = now();

  const [expiredAction] = await db
    .update(actions)
    .set({
      status: "expired",
      updated_at: currentTime,
    })
    .where(
      and(
        eq(actions.id, actionId),
        eq(actions.workspace_id, ctx.workspaceId),
        eq(actions.status, "awaiting_approval"),
        sql`${actions.expires_at} <= ${currentTime}`,
      ),
    )
    .returning();

  if (expiredAction) {
    await db
      .update(incidents)
      .set({
        status: "triaged",
        updated_at: currentTime,
      })
      .where(
        and(
          eq(incidents.id, expiredAction.incident_id),
          eq(incidents.workspace_id, ctx.workspaceId),
          eq(incidents.status, "awaiting_approval"),
        ),
      );

    await recordTimelineEvent(db, {
      workspaceId: ctx.workspaceId,
      incidentId: expiredAction.incident_id,
      type: "action_expired",
      actorType: "system",
      summary: "Rollback proposal expired without approval",
      data: { actionId },
    });
  }
}

export async function resolveIncident(
  ctx: ServiceContext,
  incidentId: string,
  note?: string | null,
  customDb?: Database,
): Promise<void> {
  const db = customDb ?? defaultDb();
  const currentTime = now();

  const [resolvedIncident] = await db
    .update(incidents)
    .set({
      status: "resolved",
      closed_reason: "manual",
      resolved_at: currentTime,
      updated_at: currentTime,
    })
    .where(
      and(
        eq(incidents.id, incidentId),
        eq(incidents.workspace_id, ctx.workspaceId),
        sql`${incidents.status} NOT IN ('resolved', 'dismissed')`,
      ),
    )
    .returning();

  if (!resolvedIncident) {
    throw new AppError("NOT_FOUND", 404, "Incident not found or already closed");
  }

  // Cancel any live action in awaiting_approval or approved
  await db
    .update(actions)
    .set({
      status: "cancelled",
      error_code: "manual_resolution",
      error_message: note ?? "Incident was manually resolved",
      updated_at: currentTime,
    })
    .where(
      and(
        eq(actions.incident_id, incidentId),
        eq(actions.workspace_id, ctx.workspaceId),
        inArray(actions.status, ["awaiting_approval", "approved"]),
      ),
    );

  await recordTimelineEvent(db, {
    workspaceId: ctx.workspaceId,
    incidentId,
    type: "incident_resolved",
    actorType: ctx.actorType,
    actorId: ctx.userId ?? ctx.identity?.keyId ?? null,
    summary: `Incident manually marked resolved${note ? `: ${note}` : ""}`,
    data: { note, reason: "manual" },
  });
}

export async function dismissIncident(
  ctx: ServiceContext,
  incidentId: string,
  note?: string | null,
  customDb?: Database,
): Promise<void> {
  const db = customDb ?? defaultDb();
  const currentTime = now();

  const [dismissedIncident] = await db
    .update(incidents)
    .set({
      status: "dismissed",
      closed_reason: "dismissed",
      resolved_at: currentTime,
      updated_at: currentTime,
    })
    .where(
      and(
        eq(incidents.id, incidentId),
        eq(incidents.workspace_id, ctx.workspaceId),
        sql`${incidents.status} NOT IN ('resolved', 'dismissed')`,
      ),
    )
    .returning();

  if (!dismissedIncident) {
    throw new AppError("NOT_FOUND", 404, "Incident not found or already closed");
  }

  // Cancel any live action in awaiting_approval or approved
  await db
    .update(actions)
    .set({
      status: "cancelled",
      error_code: "manual_dismissal",
      error_message: note ?? "Incident was dismissed",
      updated_at: currentTime,
    })
    .where(
      and(
        eq(actions.incident_id, incidentId),
        eq(actions.workspace_id, ctx.workspaceId),
        inArray(actions.status, ["awaiting_approval", "approved"]),
      ),
    );

  await recordTimelineEvent(db, {
    workspaceId: ctx.workspaceId,
    incidentId,
    type: "incident_dismissed",
    actorType: ctx.actorType,
    actorId: ctx.userId ?? ctx.identity?.keyId ?? null,
    summary: `Incident dismissed${note ? `: ${note}` : ""}`,
    data: { note, reason: "dismissed" },
  });
}

export async function retraceIncident(
  ctx: ServiceContext,
  incidentId: string,
  customDb?: Database,
): Promise<void> {
  const db = customDb ?? defaultDb();

  const [incident] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!incident) {
    throw new AppError("NOT_FOUND", 404, "Incident not found");
  }

  const isFailed = incident.trace_status === "failed";
  const isStalePending =
    incident.trace_status === "pending" &&
    incident.opened_at.getTime() < now().getTime() - 60 * 1000;

  if (!isFailed && !isStalePending) {
    throw new AppError("CONFLICT", 409, "Trace is already in progress", {
      reason: "TRACE_IN_PROGRESS",
    });
  }

  await db
    .update(incidents)
    .set({
      trace_status: "pending",
      updated_at: now(),
    })
    .where(and(eq(incidents.id, incident.id), eq(incidents.workspace_id, ctx.workspaceId)));

  await inngest.send({
    name: "incident/retrace",
    data: {
      incidentId: incident.id,
      workspaceId: ctx.workspaceId,
    },
  });
}

export async function retryAnalysis(
  ctx: ServiceContext,
  incidentId: string,
  customDb?: Database,
): Promise<{ attempt: number }> {
  const db = customDb ?? defaultDb();

  const existing = await db
    .select({ attempt: analyses.attempt })
    .from(analyses)
    .where(and(eq(analyses.incident_id, incidentId), eq(analyses.workspace_id, ctx.workspaceId)))
    .orderBy(desc(analyses.attempt))
    .limit(1);

  const maxAttempt = existing[0]?.attempt ?? 0;
  if (maxAttempt >= 3) {
    throw new AppError("CONFLICT", 409, "Maximum analysis attempts (3) exhausted", {
      reason: "ANALYSIS_ATTEMPTS_EXHAUSTED",
    });
  }

  const nextAttempt = maxAttempt + 1;
  const analysisId = newId("ana");

  await db.insert(analyses).values({
    id: analysisId,
    workspace_id: ctx.workspaceId,
    incident_id: incidentId,
    attempt: nextAttempt,
    status: "pending",
  });

  await inngest.send({
    name: "incident/analysis.requested",
    data: {
      incidentId,
      workspaceId: ctx.workspaceId,
      attempt: nextAttempt,
    },
  });

  return { attempt: nextAttempt };
}

export async function getAction(
  ctx: ServiceContext,
  actionId: string,
  customDb?: Database,
): Promise<ActionStatusView> {
  const db = customDb ?? defaultDb();

  const [action] = await db
    .select()
    .from(actions)
    .where(and(eq(actions.id, actionId), eq(actions.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!action) {
    throw new AppError("NOT_FOUND", 404, "Action not found");
  }

  const [incident] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, action.incident_id), eq(incidents.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!incident) {
    throw new AppError("NOT_FOUND", 404, "Incident not found");
  }

  const probeRows = await db
    .select()
    .from(probes)
    .where(eq(probes.action_id, action.id))
    .orderBy(asc(probes.seq));

  const probeViews: ProbeView[] = probeRows.map((p) => ({
    seq: p.seq,
    at: p.at.toISOString(),
    ok: p.ok,
    httpStatus: p.http_status,
    latencyMs: p.latency_ms,
    observedSha: p.observed_sha,
    error: p.error,
  }));

  const target = action.target_deployment as DeploymentRef;
  const from = action.from_deployment as DeploymentRef;

  let verdict: "pending" | "verified" | "failed" | null = "pending";
  if (action.status === "verified") verdict = "verified";
  else if (action.status === "verification_failed" || action.status === "failed") verdict = "failed";

  const targetSha = target.sha ? target.sha.slice(0, 7) : target.id;
  let message = `Rollback to ${targetSha} (${action.status})`;
  if (action.status === "awaiting_approval") {
    message = `Rollback to ${targetSha} awaiting approval`;
  } else if (action.status === "executing") {
    message = `Executing rollback to ${targetSha} on Vercel`;
  } else if (action.status === "verifying") {
    message = `Rollback applied, verifying production health`;
  } else if (action.status === "verified") {
    message = `Verified recovered: 3 consecutive healthy probes`;
  } else if (action.status === "verification_failed") {
    message = `Verification failed after rollback`;
  }

    const appUrl = process.env.FIREBREAK_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return {
      id: action.id,
      incident: {
        id: incident.id,
        number: incident.number,
        title: incident.title,
      },
      status: action.status as ActionStatusEnum,
      target: {
        id: target.id,
        shortSha: target.sha ? target.sha.slice(0, 7) : null,
        url: target.url,
        createdAt: target.createdAt,
      },
      from: {
        id: from.id,
        shortSha: from.sha ? from.sha.slice(0, 7) : null,
      },
      preflight: (action.preflight as PreflightCheck[]) ?? [],
      expiresAt: action.expires_at.toISOString(),
      approveUrl: `${appUrl}/app/incidents/${incident.id}?action=${action.id}`,
      decidedVia: (action.decided_via as "web" | "mcp" | null) ?? null,
      probes: probeViews,
      verdict,
      message,
    };
}

export async function getIncidentDetail(
  ctx: ServiceContext,
  incidentId: string,
  customDb?: Database,
): Promise<IncidentDetail> {
  const db = customDb ?? defaultDb();

  // 6 parallel queries per doc 03 §12
  const [incident] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!incident) {
    throw new AppError("NOT_FOUND", 404, "Incident not found");
  }

  const [servicePromise, suspectsPromise, analysisPromise, actionPromise, timelinePromise] = [
    db
      .select()
      .from(services)
      .where(and(eq(services.id, incident.service_id), eq(services.workspace_id, ctx.workspaceId)))
      .limit(1),
    db
      .select()
      .from(suspects)
      .where(and(eq(suspects.incident_id, incident.id), eq(suspects.workspace_id, ctx.workspaceId)))
      .orderBy(asc(suspects.rank)),
    db
      .select()
      .from(analyses)
      .where(and(eq(analyses.incident_id, incident.id), eq(analyses.workspace_id, ctx.workspaceId)))
      .orderBy(desc(analyses.attempt))
      .limit(1),
    db
      .select()
      .from(actions)
      .where(and(eq(actions.incident_id, incident.id), eq(actions.workspace_id, ctx.workspaceId)))
      .orderBy(desc(actions.created_at))
      .limit(1),
    db
      .select()
      .from(timeline_events)
      .where(and(eq(timeline_events.incident_id, incident.id), eq(timeline_events.workspace_id, ctx.workspaceId)))
      .orderBy(desc(timeline_events.at))
      .limit(100),
  ];

  const [
    [service],
    suspectRows,
    [latestAnalysis],
    [latestAction],
    timelineRows,
  ] = await Promise.all([
    servicePromise,
    suspectsPromise,
    analysisPromise,
    actionPromise,
    timelinePromise,
  ]);

  if (!service) {
    throw new AppError("NOT_FOUND", 404, "Service for incident not found");
  }

  // Fetch probes if an action exists
  let actionView: ActionStatusView | null = null;
  if (latestAction) {
    actionView = await getAction(ctx, latestAction.id, db);
  }

  const suspectViews: SuspectView[] = suspectRows.map((s) => ({
    id: s.id,
    rank: s.rank,
    sha: s.sha,
    shortSha: s.short_sha,
    message: s.message,
    author: s.author_name,
    committedAt: s.committed_at.toISOString(),
    url: s.html_url,
    points: s.points,
    score: s.score,
    evidence: (s.evidence as Evidence[]) ?? [],
    files: (s.files as SuspectFile[]) ?? [],
  }));

  const analysisView: AnalysisView | null = latestAnalysis
    ? {
        status: latestAnalysis.status as "pending" | "ready" | "failed" | "skipped",
        skipReason: latestAnalysis.skip_reason,
        provider: latestAnalysis.provider,
        model: latestAnalysis.model,
        attempt: latestAnalysis.attempt,
        result: (latestAnalysis.result as Analysis) ?? null,
      }
    : null;

  const timelineViews: TimelineEventView[] = timelineRows
    .slice()
    .reverse()
    .map((t) => ({
      id: t.id,
      at: t.at.toISOString(),
      type: t.type,
      actorType: t.actor_type as "system" | "user" | "mcp" | "ai",
      summary: t.summary,
    }));

  const topSuspect = suspectViews[0]
    ? { shortSha: suspectViews[0].shortSha, message: suspectViews[0].message }
    : null;

  return {
    incident: {
      id: incident.id,
      number: incident.number,
      title: incident.title,
      status: incident.status as IncidentStatus,
      severity: incident.severity as Severity,
      service: { id: service.id, name: service.name },
      openedAt: incident.opened_at.toISOString(),
      resolvedAt: incident.resolved_at?.toISOString() ?? null,
      topSuspect,
      traceStatus: incident.trace_status,
      traceError: incident.trace_error,
      traceConfidence: (incident.trace_confidence as "high" | "low" | null) ?? null,
      badDeployment: (incident.bad_deployment as DeploymentRef | null) ?? null,
      goodDeployment: (incident.good_deployment as DeploymentRef | null) ?? null,
      alertCount: incident.alert_count,
      lastAlertAt: incident.last_alert_at.toISOString(),
      closedReason: incident.closed_reason,
    },
    service: {
      id: service.id,
      name: service.name,
      repoOwner: service.repo_owner,
      repoName: service.repo_name,
      healthUrl: service.health_url,
      vercelProjectName: service.vercel_project_name,
    },
    suspects: suspectViews,
    analysis: analysisView,
    action: actionView,
    timeline: timelineViews,
  };
}

export async function countActiveIncidents(
  ctx: ServiceContext,
  customDb?: Database,
): Promise<number> {
  const db = customDb ?? defaultDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(incidents)
    .where(
      and(
        eq(incidents.workspace_id, ctx.workspaceId),
        sql`${incidents.status} NOT IN ('resolved', 'dismissed')`,
      ),
    );
  return row?.count ?? 0;
}

export async function listIncidents(
  ctx: ServiceContext,
  opts: {
    status?: "active" | "resolved" | "all";
    serviceId?: string;
    cursor?: string;
    limit?: number;
  } = {},
  customDb?: Database,
): Promise<{ items: IncidentListItem[]; nextCursor: string | null }> {
  const db = customDb ?? defaultDb();
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 50);

  const conditions = [eq(incidents.workspace_id, ctx.workspaceId)];

  if (opts.serviceId) {
    conditions.push(eq(incidents.service_id, opts.serviceId));
  }

  if (opts.status === "active" || !opts.status) {
    conditions.push(sql`${incidents.status} NOT IN ('resolved', 'dismissed')`);
  } else if (opts.status === "resolved") {
    conditions.push(sql`${incidents.status} IN ('resolved', 'dismissed')`);
  }

  if (opts.cursor) {
    try {
      const decoded = Buffer.from(opts.cursor, "base64url").toString("utf-8");
      const [cursorTime, cursorId] = decoded.split(",");
      if (cursorTime && cursorId) {
        conditions.push(
          sql`(${incidents.opened_at}, ${incidents.id}) < (${new Date(cursorTime)}, ${cursorId})`,
        );
      }
    } catch {
      // Invalid cursor ignored
    }
  }

  const rows = await db
    .select({
      incident: incidents,
      serviceName: services.name,
    })
    .from(incidents)
    .innerJoin(services, eq(incidents.service_id, services.id))
    .where(and(...conditions))
    .orderBy(desc(incidents.opened_at), desc(incidents.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const incidentIds = pageRows.map((r) => r.incident.id);
  const topSuspectsMap = new Map<string, { shortSha: string; message: string }>();

  if (incidentIds.length > 0) {
    const suspectRows = await db
      .select()
      .from(suspects)
      .where(and(inArray(suspects.incident_id, incidentIds), eq(suspects.rank, 1)));

    for (const s of suspectRows) {
      topSuspectsMap.set(s.incident_id, {
        shortSha: s.short_sha,
        message: s.message,
      });
    }
  }

  const items: IncidentListItem[] = pageRows.map(({ incident, serviceName }) => ({
    id: incident.id,
    number: incident.number,
    title: incident.title,
    status: incident.status as IncidentStatus,
    severity: incident.severity as Severity,
    service: { id: incident.service_id, name: serviceName },
    openedAt: incident.opened_at.toISOString(),
    resolvedAt: incident.resolved_at?.toISOString() ?? null,
    topSuspect: topSuspectsMap.get(incident.id) ?? null,
  }));

  let nextCursor: string | null = null;
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1]!.incident;
    nextCursor = Buffer.from(`${last.opened_at.toISOString()},${last.id}`).toString("base64url");
  }

  return { items, nextCursor };
}

export async function resolveIncidentId(
  ctx: ServiceContext,
  incidentRef: string,
  customDb?: Database,
): Promise<string> {
  const db = customDb ?? defaultDb();
  const trimmed = incidentRef.trim();

  if (trimmed.startsWith("inc_")) {
    const [inc] = await db
      .select({ id: incidents.id })
      .from(incidents)
      .where(and(eq(incidents.id, trimmed), eq(incidents.workspace_id, ctx.workspaceId)))
      .limit(1);

    if (inc) return inc.id;
  } else {
    // Try parsing as incident number: e.g. "INC-12", "inc-12", "#12", "12"
    const cleaned = trimmed.replace(/^(INC|inc)[-#]?/i, "").replace(/^#/, "").trim();
    const num = parseInt(cleaned, 10);
    if (!isNaN(num)) {
      const [inc] = await db
        .select({ id: incidents.id })
        .from(incidents)
        .where(and(eq(incidents.number, num), eq(incidents.workspace_id, ctx.workspaceId)))
        .limit(1);

      if (inc) return inc.id;
    }
  }

  throw new AppError("NOT_FOUND", 404, `Incident '${incidentRef}' not found`);
}

export async function getIncidentCard(
  ctx: ServiceContext,
  input: { incident: string },
  customDb?: Database,
): Promise<IncidentCard> {
  const db = customDb ?? defaultDb();
  const incidentId = await resolveIncidentId(ctx, input.incident, db);

  const [incident] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.workspace_id, ctx.workspaceId)))
    .limit(1);

  if (!incident) {
    throw new AppError("NOT_FOUND", 404, "Incident not found");
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, incident.service_id), eq(services.workspace_id, ctx.workspaceId)))
    .limit(1);

  const [topSuspect] = await db
    .select()
    .from(suspects)
    .where(and(eq(suspects.incident_id, incident.id), eq(suspects.workspace_id, ctx.workspaceId), eq(suspects.rank, 1)))
    .limit(1);

  const [latestAction] = await db
    .select()
    .from(actions)
    .where(and(eq(actions.incident_id, incident.id), eq(actions.workspace_id, ctx.workspaceId)))
    .orderBy(desc(actions.created_at))
    .limit(1);

  const appUrl = process.env.FIREBREAK_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const badDeployment = incident.bad_deployment as DeploymentRef | null;
  const goodDeployment = incident.good_deployment as DeploymentRef | null;

  return {
    id: incident.id,
    number: incident.number,
    title: incident.title,
    status: incident.status as IncidentStatus,
    severity: incident.severity as Severity,
    service: service?.name ?? "Unknown Service",
    openedAt: incident.opened_at.toISOString(),
    bad: badDeployment ? { shortSha: badDeployment.sha ? badDeployment.sha.slice(0, 7) : null } : null,
    good: goodDeployment ? { shortSha: goodDeployment.sha ? goodDeployment.sha.slice(0, 7) : null } : null,
    topSuspect: topSuspect ? { shortSha: topSuspect.short_sha, message: topSuspect.message, points: topSuspect.points } : null,
    action: latestAction ? { id: latestAction.id, status: latestAction.status as ActionStatusEnum } : null,
    appUrl: `${appUrl}/app/incidents/${incident.id}`,
  };
}

