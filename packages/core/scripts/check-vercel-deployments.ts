import { requireEnv } from "../src/index.js";

async function main() {
  const token = requireEnv("VERCEL_TOKEN");
  const projectId = "prj_XazkCwVBErNOlErk1rHj3s8Guk7u";
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`, { headers });
  const data = await res.json();
  console.log("=== VERCEL DEPLOYMENTS FOR FIREBREAK ===");
  if (!data.deployments || data.deployments.length === 0) {
    console.log("No deployments triggered yet.");
  } else {
    for (const d of data.deployments) {
      console.log(`- ID: ${d.uid}, State: ${d.state}, URL: https://${d.url}, Created: ${new Date(d.created).toISOString()}`);
    }
  }
}

main().catch(console.error);
