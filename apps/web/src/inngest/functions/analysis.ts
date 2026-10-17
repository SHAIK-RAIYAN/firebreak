import { inngest, systemCtx, analyzeIncident } from "@firebreak/core";

export const incidentAnalysis = inngest.createFunction(
  {
    id: "incident-analysis",
    triggers: [
      { event: "incident/traced" },
      { event: "incident/analysis.requested" },
    ],
    concurrency: { key: "event.data.incidentId", limit: 1 },
    retries: 1,
  },
  async ({ event, step }) => {
    const ctx = systemCtx(event.data.workspaceId);
    const attempt =
      "attempt" in event.data && typeof event.data.attempt === "number"
        ? event.data.attempt
        : 1;

    return step.run("analyze", async () => {
      return analyzeIncident(ctx, event.data.incidentId, attempt);
    });
  },
);
