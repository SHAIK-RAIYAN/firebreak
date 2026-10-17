import {
  inngest,
  systemCtx,
  traceIncident,
  proposeRollback,
  db,
  incidents,
  recordTimelineEvent,
} from "@firebreak/core";
import { eq, sql } from "drizzle-orm";

async function handlePipelineFailure({
  event,
  error,
}: {
  event: Record<string, unknown>;
  error: unknown;
}) {
  const eventData = event?.data as Record<string, unknown> | undefined;
  const nestedEvent = eventData?.event as Record<string, unknown> | undefined;
  const nestedData = nestedEvent?.data as Record<string, unknown> | undefined;

  const incidentId =
    (nestedData?.incidentId as string | undefined) ??
    (eventData?.incidentId as string | undefined);
  const workspaceId =
    (nestedData?.workspaceId as string | undefined) ??
    (eventData?.workspaceId as string | undefined);

  if (!incidentId || !workspaceId) return;

  const database = db();
  await database
    .update(incidents)
    .set({
      trace_status: "failed",
      trace_error: "upstream_unavailable",
      status: sql`case when ${incidents.status} = 'open' then 'triaged' else ${incidents.status} end`,
    })
    .where(eq(incidents.id, incidentId));

  await recordTimelineEvent(database, {
    workspaceId,
    incidentId,
    type: "trace_failed",
    summary: "Trace failed: Upstream service unavailable after retries",
    data: { error: error instanceof Error ? error.message : String(error) },
  });
}

export const incidentPipeline = inngest.createFunction(
  {
    id: "incident-pipeline",
    triggers: { event: "incident/opened" },
    concurrency: { key: "event.data.incidentId", limit: 1 },
    idempotency: "event.data.incidentId",
    retries: 3,
    onFailure: handlePipelineFailure,
  },
  async ({ event, step }) => {
    const ctx = systemCtx(event.data.workspaceId);

    const traceResult = await step.run("trace", async () => {
      return traceIncident(ctx, event.data.incidentId);
    });

    if (traceResult.hasTarget) {
      await step.run("propose", async () => {
        return proposeRollback(ctx, event.data.incidentId, null);
      });
    }

    await step.sendEvent("send-traced", {
      name: "incident/traced",
      data: {
        incidentId: event.data.incidentId,
        workspaceId: event.data.workspaceId,
        hasTarget: traceResult.hasTarget,
      },
    });

    return { ok: true, hasTarget: traceResult.hasTarget };
  },
);

export const incidentRetrace = inngest.createFunction(
  {
    id: "incident-retrace",
    triggers: { event: "incident/retrace" },
    concurrency: { key: "event.data.incidentId", limit: 1 },
    retries: 3,
    onFailure: handlePipelineFailure,
  },
  async ({ event, step }) => {
    const ctx = systemCtx(event.data.workspaceId);

    const traceResult = await step.run("trace", async () => {
      return traceIncident(ctx, event.data.incidentId);
    });

    if (traceResult.hasTarget) {
      await step.run("propose", async () => {
        return proposeRollback(ctx, event.data.incidentId, null);
      });
    }

    await step.sendEvent("send-traced", {
      name: "incident/traced",
      data: {
        incidentId: event.data.incidentId,
        workspaceId: event.data.workspaceId,
        hasTarget: traceResult.hasTarget,
      },
    });

    return { ok: true, hasTarget: traceResult.hasTarget };
  },
);
