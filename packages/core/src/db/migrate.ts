import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "migrations");

async function runMigrate() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required for migrations");
  }

  const host = url.split("@")[1]?.split("/")[0] || "database";
  console.log(`Applying migrations via neon-http to ${host}...`);
  const sql = neon(url);
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder });
  console.log("✓ Migrations applied successfully!");
}

runMigrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
