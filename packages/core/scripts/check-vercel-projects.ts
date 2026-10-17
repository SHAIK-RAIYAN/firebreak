import { vercelClient } from "../src/index.js";

async function main() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error("VERCEL_TOKEN not set");
    return;
  }
  const client = vercelClient({ token });
  const projects = await client.listProjects();
  console.log("=== VERCEL PROJECTS ===");
  console.log(projects.map(p => ({ id: p.id, name: p.name })));
}

main().catch(console.error);
