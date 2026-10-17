import { requireEnv } from "../src/index.js";

async function main() {
  const token = requireEnv("VERCEL_TOKEN");
  const dplId = "dpl_F3mkd5oUL6idHJWLxAvhJGR2Xr31";
  const projectId = "prj_XazkCwVBErNOlErk1rHj3s8Guk7u";
  const teamId = "team_1WXQByQasyd1D1qbwWCcGxXl";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  console.log(`Calling promote endpoint for ${dplId}...`);
  const res = await fetch(`https://api.vercel.com/v13/deployments/${dplId}/promote?teamId=${teamId}`, {
    method: "POST",
    headers,
  });

  const data = await res.json();
  console.log("Promote response status:", res.status);
  console.log("Promote response data:", data);

  // Also disable deployment protection if needed so public can view
  const protRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      ssoProtection: null,
      passwordProtection: null,
    }),
  });
  console.log("Protection patch status:", protRes.status);
}

main().catch(console.error);
