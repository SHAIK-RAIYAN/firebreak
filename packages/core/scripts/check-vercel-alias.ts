import { requireEnv } from "../src/index.js";

async function main() {
  const token = requireEnv("VERCEL_TOKEN");
  const projectId = "prj_XazkCwVBErNOlErk1rHj3s8Guk7u";
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, { headers });
  const data = await res.json();
  console.log("Project targets:", data.targets);

  const curDpl = await fetch(`https://api.vercel.com/v13/deployments/dpl_F3mkd5oUL6idHJWLxAvhJGR2Xr31`, { headers });
  const dplData = await curDpl.json();
  console.log("Deployment aliases:", dplData.alias);
}

main().catch(console.error);
