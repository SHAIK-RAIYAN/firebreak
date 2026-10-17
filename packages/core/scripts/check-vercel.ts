import { vercelClient } from "../src/index.js";

async function main() {
  const client = vercelClient({ token: process.env.VERCEL_TOKEN! });
  const p = await client.getProject("prj_M5MaS6jYvODRdjIYhYMai6YWwxND");
  console.log("Project targets.production:", p.targets?.production);
  console.log("Project lastAliasRequest:", p.lastAliasRequest);
  const cur = await client.getCurrentProduction("prj_M5MaS6jYvODRdjIYhYMai6YWwxND");
  console.log("Current production deployment:", cur);
}

main().catch(console.error);
