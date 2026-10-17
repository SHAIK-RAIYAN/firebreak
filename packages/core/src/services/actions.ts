import { eq, and, inArray, sql } from "drizzle-orm";
import { db as defaultDb, type Database } from "../db/client.js";
import {
  incidents,
  services,
  actions,
  type DeploymentRef,
} from "../db/schema.js";
import { type ServiceContext } from "./context.js";
import { getVercelClientForWorkspace } from "./integrations.js";
import { probe } from "../adapters/probe.js";
import { evaluatePreflight } from "../domain/preflight.js";
import { AppError } from "../domain/errors.js";
import { newId } from "../util/ids.js";
import { now } from "../util/time.js";
import { logger } from "../util/logger.js";
import { recordTimelineEvent } from "./timeline.js";
import { inngest } from "../inngest/client.js";

export const ACTION_APPROVAL_TTL_MIN = 15;

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
