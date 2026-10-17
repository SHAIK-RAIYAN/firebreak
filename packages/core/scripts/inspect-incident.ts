import { db, incidents, suspects, actions, timeline_events } from "../src/index.js";
import { eq } from "drizzle-orm";

async function main() {
  const database = db();
  const inc = await database.select().from(incidents).where(eq(incidents.id, "inc_6ob8js87ey5s4gpmuabk"));
  console.log("=== INCIDENT ===");
  console.log(inc[0]);

  const susp = await database.select().from(suspects).where(eq(suspects.incident_id, "inc_6ob8js87ey5s4gpmuabk"));
  console.log("=== SUSPECTS ===");
  console.log(susp);

  const acts = await database.select().from(actions).where(eq(actions.incident_id, "inc_6ob8js87ey5s4gpmuabk"));
  console.log("=== ACTIONS ===");
  console.log(acts);

  const events = await database.select().from(timeline_events).where(eq(timeline_events.incident_id, "inc_6ob8js87ey5s4gpmuabk"));
  console.log("=== TIMELINE EVENTS ===");
  console.log(events.map(e => ({ type: e.type, message: e.message, at: e.created_at })));
}

main().catch(console.error);
