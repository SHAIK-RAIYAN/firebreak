import { db, probes, actions, incidents } from "../src/index.js";
import { eq } from "drizzle-orm";

async function main() {
  const database = db();
  const prb = await database.select().from(probes).where(eq(probes.action_id, "act_cdo8g2jf0okvcfjhg7gn"));
  console.log("=== PROBES IN DB ===");
  console.log(prb.map(p => ({
    probe_number: p.probe_number,
    status: p.status,
    healthy: p.healthy,
    latency_ms: p.latency_ms,
    observed_sha: p.observed_sha?.slice(0, 7),
  })));

  const act = await database.select().from(actions).where(eq(actions.id, "act_cdo8g2jf0okvcfjhg7gn"));
  console.log("Action Status:", act[0]?.status);

  const inc = await database.select().from(incidents).where(eq(incidents.id, "inc_6ob8js87ey5s4gpmuabk"));
  console.log("Incident Status:", inc[0]?.status);
}

main().catch(console.error);
