import { listIntegrations, userCtx } from "../src/index.js";

async function main() {
  const ctx = userCtx("ws_1alsok80tozt4sqaq650", "YvboBOU9h57JEDUQ5Hr38bBfNj2tFYR1");
  const res = await listIntegrations(ctx);
  console.log("=== INTEGRATIONS API RESULT ===");
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
