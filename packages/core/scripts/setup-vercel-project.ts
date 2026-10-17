import { requireEnv } from "../src/index.js";

async function main() {
  const token = requireEnv("VERCEL_TOKEN");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  console.log("Checking if Vercel project already exists...");
  const listRes = await fetch("https://api.vercel.com/v9/projects", { headers });
  const listData = await listRes.json();
  const existing = listData.projects?.find((p: any) => p.name === "firebreak" || p.name === "firebreak-app");

  let project = existing;
  if (!project) {
    console.log("Creating Vercel project 'firebreak'...");
    const createRes = await fetch("https://api.vercel.com/v9/projects", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "firebreak",
        framework: "nextjs",
        rootDirectory: "apps/web",
        buildCommand: "cd ../.. && npm run build --workspace=@firebreak/web",
        installCommand: "npm install",
        gitRepository: {
          type: "github",
          repo: "SHAIK-RAIYAN/firebreak",
        },
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      if (createData.error?.code === "project_already_exists" || createData.error?.code === "conflict") {
        console.log("Name 'firebreak' taken, trying 'firebreak-app'...");
        const res2 = await fetch("https://api.vercel.com/v9/projects", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: "firebreak-app",
            framework: "nextjs",
            rootDirectory: "apps/web",
            buildCommand: "cd ../.. && npm run build --workspace=@firebreak/web",
            installCommand: "npm install",
            gitRepository: {
              type: "github",
              repo: "SHAIK-RAIYAN/firebreak",
            },
          }),
        });
        project = await res2.json();
      } else {
        console.error("Failed to create project:", createData);
        process.exit(1);
      }
    } else {
      project = createData;
    }
  }

  console.log("Vercel Project Active:", project.id, project.name);

  // Read environment variables to sync
  const envVars: Record<string, string> = {
    DATABASE_URL: process.env.DATABASE_URL!,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED!,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: `https://${project.name}.vercel.app`,
    GITHUB_OAUTH_CLIENT_ID: process.env.GITHUB_OAUTH_CLIENT_ID!,
    GITHUB_OAUTH_CLIENT_SECRET: process.env.GITHUB_OAUTH_CLIENT_SECRET!,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID!,
    GITHUB_APP_SLUG: process.env.GITHUB_APP_SLUG!,
    GITHUB_APP_CLIENT_ID: process.env.GITHUB_APP_CLIENT_ID!,
    GITHUB_APP_CLIENT_SECRET: process.env.GITHUB_APP_CLIENT_SECRET!,
    GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY!,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET!,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
    STATE_SECRET: process.env.STATE_SECRET!,
    NEXT_PUBLIC_SITE_URL: `https://${project.name}.vercel.app`,
    NEXT_PUBLIC_MCP_URL: process.env.NEXT_PUBLIC_MCP_URL || `https://${project.name}.vercel.app/api/mcp`,
    DEFAULT_AI_PROVIDER: process.env.DEFAULT_AI_PROVIDER || "google",
    DEFAULT_AI_MODEL: process.env.DEFAULT_AI_MODEL || "gemini-3.8-flash",
    DEFAULT_AI_API_KEY: process.env.DEFAULT_AI_API_KEY || "",
  };

  console.log("Syncing environment variables to Vercel...");
  for (const [key, val] of Object.entries(envVars)) {
    if (!val) continue;
    try {
      await fetch(`https://api.vercel.com/v10/projects/${project.id}/env`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          key,
          value: val,
          type: "encrypted",
          target: ["production", "preview", "development"],
        }),
      });
      console.log(`  ✓ Synced ${key}`);
    } catch (e: any) {
      console.warn(`  ⚠ ${key}:`, e.message);
    }
  }

  console.log("Vercel setup complete!");
  console.log(`URL: https://${project.name}.vercel.app`);
}

main().catch(console.error);
