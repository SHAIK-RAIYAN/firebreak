import { vercelClient } from "../src/index.js";

async function main() {
  const client = vercelClient({ token: process.env.VERCEL_TOKEN! });
  const p = await client.getProject("prj_M5MaS6jYvODRdjIYhYMai6YWwxND");
  console.log("Demo project link:", (p as any).link);
}

main().catch(console.error);
