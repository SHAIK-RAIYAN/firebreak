import { db, incidents } from "../src/index.js";
import { eq, or } from "drizzle-orm";

async function main() {
  const database = db();
  const rows = await database.select().from(incidents);
  console.log("=== INCIDENTS IN DB ===");
  console.log(rows.map(r => ({ id: r.id, service_id: r.service_id, status: r.status, title: r.title, created_at: r.created_at })));
}

main().catch(console.error);
