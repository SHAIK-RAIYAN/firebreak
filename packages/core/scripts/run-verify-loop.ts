import {
  db,
  systemCtx,
  confirmProduction,
  recordProbe,
  finishVerification,
  incidents,
  actions,
  probes,
  timeline_events,
} from "../src/index.js";
import { eq } from "drizzle-orm";

async function main() {
  const workspaceId = "ws_1alsok80tozt4sqaq650";
  const actionId = "act_cdo8g2jf0okvcfjhg7gn";
  const incidentId = "inc_6ob8js87ey5s4gpmuabk";
  const ctx = systemCtx(workspaceId);

  console.log("=== Step 1: Confirm Production Deployment ===");
  const conf = await confirmProduction(ctx, actionId);
  console.log("confirmProduction result:", conf);

  console.log("\n=== Step 2: Automated Verification Probe Streak (Target: 3 consecutive 200 OK) ===");
  let streak = 0;
  for (let seq = 1; seq <= 6; seq++) {
    const res = await recordProbe(ctx, actionId, seq);
    console.log(`Probe #${seq}: ok=${res.ok}, current streak=${res.streak}/3`);
    streak = res.streak;
    if (streak >= 3) {
      console.log("Verification streak requirement achieved (3/3 healthy probes)!");
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\n=== Step 3: Finish Verification & Transition Incident ===");
  await finishVerification(ctx, actionId, streak >= 3);

  const database = db();
  const [act] = await database.select().from(actions).where(eq(actions.id, actionId));
  const [inc] = await database.select().from(incidents).where(eq(incidents.id, incidentId));
  const allProbes = await database.select().from(probes).where(eq(probes.action_id, actionId));
  const events = await database.select().from(timeline_events).where(eq(timeline_events.incident_id, incidentId));

  console.log("\n=== FINAL RESULTS ===");
  console.log("Action Status:", act?.status);
  console.log("Incident Status:", inc?.status);
  console.log("Total Recorded Probes:", allProbes.length);
  console.log("Probes Detail:", allProbes.map(p => ({ seq: p.probe_number, status: p.status, sha: p.observed_sha?.slice(0, 7), latency: p.latency_ms })));
  console.log("Timeline Events:", events.map(e => e.type));
}

main().catch(console.error);
