import { requireEnv } from "../src/index.js";

async function main() {
  const token = requireEnv("VERCEL_TOKEN");
  const projectId = "prj_XazkCwVBErNOlErk1rHj3s8Guk7u";
  const teamId = "team_1WXQByQasyd1D1qbwWCcGxXl";
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log("Vercel Env Vars Count:", data.envs?.length);
  if (data.envs) {
    for (const e of data.envs) {
      console.log(`- ${e.key} (targets: ${e.target?.join(", ")})`);
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
