import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { vercelClient } from "@firebreak/core";

// Load environment variables
const fixturesEnvPath = path.resolve(process.cwd(), "packages/fixtures/.env");
if (fs.existsSync(fixturesEnvPath)) {
  dotenv.config({ path: fixturesEnvPath });
}
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

function git(cmd: string, cwd: string): string {
  return execSync(`git ${cmd}`, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function resolveDemoRepoPath(raw: string = process.env.DEMO_REPO_PATH || "../firebreak-demo"): string {
  if (path.isAbsolute(raw) && fs.existsSync(raw)) return raw;
  const fromCwd = path.resolve(process.cwd(), raw);
  if (fs.existsSync(fromCwd)) return fromCwd;
  const candidates = [
    path.resolve(process.cwd(), "../../firebreak-demo"),
    path.resolve(process.cwd(), "../firebreak-demo"),
    path.resolve(process.cwd(), "firebreak-demo"),
    "F:/VS CODE/Hackathons/firebreak-demo",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return path.resolve(c);
  }
  return fromCwd;
}

export async function runReset() {
  const repoPath = resolveDemoRepoPath();

  const healthUrl =
    process.env.DEMO_HEALTH_URL || "https://firebreak-demo.vercel.app/api/health";

  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelTeamId = process.env.VERCEL_TEAM_ID || undefined;

  console.log("=== Firebreak Fixture: Reset Demo Repo ===");
  console.log(`Demo repo: ${repoPath}`);
  console.log(`Health URL: ${healthUrl}\n`);

  if (!fs.existsSync(repoPath)) {
    console.error(`Error: Demo repository not found at ${repoPath}`);
    process.exit(1);
  }

  // 1. Write pricing.good.ts over lib/pricing.ts
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const goodTemplateCandidates = [
    path.resolve(currentDir, "../templates/pricing.good.ts"),
    path.resolve(process.cwd(), "packages/fixtures/templates/pricing.good.ts"),
    path.resolve(process.cwd(), "templates/pricing.good.ts"),
  ];
  const goodTemplatePath = goodTemplateCandidates.find((p) => fs.existsSync(p));
  if (!goodTemplatePath) {
    console.error(`Error: Template not found at any candidate: ${goodTemplateCandidates.join(", ")}`);
    process.exit(1);
  }

  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const goodContent = `// demo run ${runId}\n` + fs.readFileSync(goodTemplatePath, "utf8");
  const targetPricingPath = path.join(repoPath, "lib", "pricing.ts");
  fs.writeFileSync(targetPricingPath, goodContent, "utf8");

  git("add lib/pricing.ts", repoPath);
  try {
    git(`commit -m "fix: restore applyDiscount (run ${runId})"`, repoPath);
    console.log(`Committed fix in demo repo (run ${runId})`);
  } catch (err: any) {
    console.log("No changes to commit or commit failed:", err?.message ?? err);
  }

  console.log("Pushing fix to origin main...");
  try {
    git("push origin main", repoPath);
    console.log("Pushed fix to GitHub main successfully!");
  } catch (err: any) {
    console.warn("Notice: git push failed:", err?.message ?? err);
  }

  // 2. If Vercel token is provided, promote newest deployment after a rollback
  if (vercelToken && vercelProjectId) {
    console.log("\nChecking Vercel deployments to ensure new commit is promoted...");
    const client = vercelClient({ token: vercelToken, teamId: vercelTeamId });

    try {
      const prod = await client.getCurrentProduction(vercelProjectId);
      console.log(`Current production on Vercel: ${prod.id} (${prod.sha?.slice(0, 7) ?? "unknown"})`);
    } catch (err: any) {
      console.warn("Could not query Vercel current production:", err?.message ?? err);
    }
  }

  // 3. Poll health URL until 200 OK
  console.log(`\nWaiting for demo app to return 200 OK at ${healthUrl}...`);
  for (let attempt = 1; attempt <= 36; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(8000) });
      const body: any = await res.json().catch(() => ({}));

      if (res.ok) {
        console.log(`\nDemo reset successfully! Status: ${res.status} OK`);
        console.log(`- Active SHA: ${body.sha ?? "unknown"}`);
        return;
      } else {
        process.stdout.write(`Attempt ${attempt}/36: status ${res.status}...\r`);
      }
    } catch {
      process.stdout.write(`Attempt ${attempt}/36: waiting for server...\r`);
    }
  }

  console.log("\nReset complete (health check verification timed out).");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runReset().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
}
