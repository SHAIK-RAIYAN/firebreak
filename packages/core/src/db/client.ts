import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";
import { requireEnv } from "../util/env.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Lazy init database client — does not connect at import time.
 * neon() connects on first query.
 */
export function db() {
  if (!_db) {
    _db = drizzle(neon(requireEnv("DATABASE_URL")), { schema });
  }
  return _db;
}

export type Database = ReturnType<typeof db>;
