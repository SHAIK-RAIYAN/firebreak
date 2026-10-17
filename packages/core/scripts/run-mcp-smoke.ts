import { db } from "../src/db/client.js";
import { workspaces } from "../src/db/schema.js";
import { userCtx, createMcpKey } from "../src/index.js";
import { execSync } from "node:child_process";

async function main() {
  const database = db();
  const [ws] = await database.select().from(workspaces).limit(1);
  if (!ws) throw new Error("No workspace");

  const ctx = userCtx(ws.id, ws.owner_user_id);
  const { key } = await createMcpKey(ctx, {
    name: "Smoke Test Runner Key",
    scopes: ["incidents:read", "actions:propose", "actions:approve"],
  });

  console.log("Created test key, running smoke test against http://127.0.0.1:3005/mcp...");
  execSync("npx tsx apps/mcp/scripts/smoke.ts", {
    env: {
      ...process.env,
      MCP_URL: "http://127.0.0.1:3005/mcp",
      FIREBREAK_MCP_KEY: key,
    },
    stdio: "inherit",
  });
  console.log("Smoke test completed successfully!");
}

main().catch(console.error);
