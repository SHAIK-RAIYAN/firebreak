import { requireEnv } from "../src/index.js";

async function main() {
  const token = requireEnv("VERCEL_TOKEN");
  const projectId = "prj_XazkCwVBErNOlErk1rHj3s8Guk7u";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const buildCommand = "cd ../.. && npm run build --workspace=@firebreak/core && npm run build --workspace=@firebreak/web";
  console.log(`Updating buildCommand to: "${buildCommand}"...`);

  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      buildCommand,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Failed to update project:", data);
    process.exit(1);
  }

  console.log("Updated project buildCommand successfully!");
  console.log("Current buildCommand:", data.buildCommand);
}

main().catch(console.error);
