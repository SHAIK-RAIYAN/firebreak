import {
  inngest,
  systemCtx,
  executeAction,
  confirmProduction,
  recordProbe,
  finishVerification,
  expireAction,
  VERIFY_MAX_PROBES,
  VERIFY_INTERVAL_S,
  VERIFY_REQUIRED_STREAK,
  db,
  actions,
  incidents,
  recordTimelineEvent,
} from "@firebreak/core";
import { eq, and, inArray } from "drizzle-orm";

async function handleActionExecuteFailure({
  event,
  error,
}: {
  event: Record<string, unknown>;
  error: unknown;
}) {
  const eventData = event?.data as Record<string, unknown> | undefined;
  const nestedEvent = eventData?.event as Record<string, unknown> | undefined;
  const nestedData = nestedEvent?.data as Record<string, unknown> | undefined;

  const actionId =
    (nestedData?.actionId as string | undefined) ??
    (eventData?.actionId as string | undefined);
  const workspaceId =
    (nestedData?.workspaceId as string | undefined) ??
    (eventData?.workspaceId as string | undefined);

  if (!actionId || !workspaceId) return;

  const database = db();
  const [action] = await database
    .select()
    .from(actions)
    .where(and(eq(actions.id, actionId), eq(actions.workspace_id, workspaceId)))
    .limit(1);

  if (!action) return;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const isConfirmTimeout =
    errorMessage.includes("Timed out") || errorMessage.includes("VERCEL_CONFIRM");
  const errorCode = isConfirmTimeout ? "vercel_confirm_timeout" : "execution_failed";

  if (action.status === "verifying") {
    await database
      .update(actions)
      .set({
        status: "verification_failed",
        error_code: errorCode,
        error_message: errorMessage,
        updated_at: new Date(),
      })
      .where(eq(actions.id, action.id));

    await database
      .update(incidents)
      .set({ status: "mitigation_failed", updated_at: new Date() })
      .where(eq(incidents.id, action.incident_id));

    await recordTimelineEvent(database, {
      workspaceId,
      incidentId: action.incident_id,
      type: "verification_failed",
      summary: `Verification failed: ${errorMessage}`,
      data: { actionId: action.id, error: errorMessage },
    });
  } else {
    await database
      .update(actions)
      .set({
        status: "failed",
        error_code: errorCode,
        error_message: errorMessage,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(actions.id, action.id),
          inArray(actions.status, ["approved", "executing"]),
        ),
      );

    await database
      .update(incidents)
      .set({ status: "mitigation_failed", updated_at: new Date() })
      .where(eq(incidents.id, action.incident_id));

    await recordTimelineEvent(database, {
      workspaceId,
      incidentId: action.incident_id,
      type: "action_failed",
      summary: `Rollback failed: ${errorMessage}`,
      data: { actionId: action.id, errorCode, error: errorMessage },
    });
  }
}

export const actionExecute = inngest.createFunction(
  {
    id: "action-execute",
    triggers: { event: "action/approved" },
    concurrency: { key: "event.data.actionId", limit: 1 },
    idempotency: "event.data.actionId",
    retries: 3,
    onFailure: handleActionExecuteFailure,
  },
  async ({ event, step }) => {
    const ctx = systemCtx(event.data.workspaceId);

    const exec = await step.run("execute", async () => {
      return executeAction(ctx, event.data.actionId);
    });
    if (exec.stop) return exec;

    const conf = await step.run("confirm", async () => {
      return confirmProduction(ctx, event.data.actionId);
    });
    if (conf.stop) return conf;

    let verified = false;
    for (let i = 1; i <= VERIFY_MAX_PROBES; i++) {
      await step.sleep(`wait-${i}`, i === 1 ? "5s" : `${VERIFY_INTERVAL_S}s`);
      const p = await step.run(`probe-${i}`, async () => {
        return recordProbe(ctx, event.data.actionId, i);
      });
      if (p.streak >= VERIFY_REQUIRED_STREAK) {
        verified = true;
        break;
      }
    }

    await step.run("finish", async () => {
      await finishVerification(ctx, event.data.actionId, verified);
      return { verified };
    });

    return { ok: true, verified };
  },
);

export const actionExpiry = inngest.createFunction(
  {
    id: "action-expiry",
    triggers: { event: "action/proposed" },
    concurrency: { key: "event.data.actionId", limit: 1 },
  },
  async ({ event, step }) => {
    const ctx = systemCtx(event.data.workspaceId);

    await step.sleepUntil("until-expiry", new Date(event.data.expiresAt));

    await step.run("expire", async () => {
      await expireAction(ctx, event.data.actionId);
      return { expired: true };
    });

    return { ok: true };
  },
);
