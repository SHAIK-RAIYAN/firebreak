import { requireEnv } from "../src/index.js";

async function main() {
  const token = requireEnv("VERCEL_TOKEN");
  const projectId = "prj_XazkCwVBErNOlErk1rHj3s8Guk7u";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  console.log("Triggering fresh deployment for 'firebreak' on Vercel...");
  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "firebreak",
      project: projectId,
      gitSource: {
        type: "github",
        repoId: 1423159651,
        ref: "main",
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Failed to trigger deploy:", data);
    process.exit(1);
  }

  console.log("Triggered deployment successfully!");
  console.log(`ID: ${data.id}, State: ${data.status || data.readyState}, URL: https://${data.url}`);
}

main().catch(console.error);
