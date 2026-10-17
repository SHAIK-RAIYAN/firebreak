import { db, actions, incidents, timelineEvents } from "../src/db/index.js";
import { eq, and, or } from "drizzle-orm";
import { newId } from "../src/index.js";

async function main() {
  const actionId = process.argv[2];

  if (!actionId) {
    console.error("Usage: pnpm ops:cancel-action <actionId>");
    process.exit(1);
  }

  console.log(`Locating action ${actionId}...`);

  const database = db();
  const [act] = await database.select().from(actions).where(eq(actions.id, actionId));

  if (!act) {
    console.error(`Action ${actionId} not found.`);
    process.exit(1);
  }

  console.log(`Action ${actionId} currently in state: ${act.status}`);

  if (act.status !== "executing" && act.status !== "verifying" && act.status !== "approved") {
    console.warn(`Action is in terminal/non-cancellable status "${act.status}". No mutation applied.`);
    process.exit(0);
  }

  const now = new Date();

  // CAS update to failed
  const res = await database
    .update(actions)
    .set({
      status: "failed",
      failureReason: "Cancelled by on-call operator via ops:cancel-action runbook",
      updatedAt: now,
    })
    .where(
      and(
        eq(actions.id, actionId),
        or(eq(actions.status, "executing"), eq(actions.status, "verifying"), eq(actions.status, "approved"))
      )
    );

  // Transition incident
  await database
    .update(incidents)
    .set({
      status: "mitigation_failed",
      updatedAt: now,
    })
    .where(eq(incidents.id, act.incidentId));

  // Add timeline event
  await database.insert(timelineEvents).values({
    id: newId("tle"),
    incidentId: act.incidentId,
    workspaceId: act.workspaceId,
    eventType: "action_failed",
    actorType: "human",
    actorId: "operator_ops_script",
    summary: `Action ${actionId} cancelled by operator runbook`,
    payload: {
      actionId,
      cancelledStatus: act.status,
      reason: "ops:cancel-action runbook invocation",
    },
    createdAt: now,
  });

  console.log(`✓ Action ${actionId} transitioned to failed.`);
  console.log(`✓ Incident ${act.incidentId} transitioned to mitigation_failed.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
