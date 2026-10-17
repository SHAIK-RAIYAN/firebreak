import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

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

export async function runBreak() {
  const repoPath = resolveDemoRepoPath();

  const healthUrl =
    process.env.DEMO_HEALTH_URL || "https://firebreak-demo.vercel.app/api/health";

  console.log("=== Firebreak Fixture: Break Production ===");
  console.log(`Demo repo: ${repoPath}`);
  console.log(`Health URL: ${healthUrl}\n`);

  if (!fs.existsSync(repoPath)) {
    console.error(`Error: Demo repository not found at ${repoPath}`);
    console.error("Please set DEMO_REPO_PATH in packages/fixtures/.env to the local clone of firebreak-demo.");
    process.exit(1);
  }

  // 1. Verify clean git working tree on main branch
  try {
    const status = git("status --porcelain", repoPath);
    if (status.length > 0) {
      console.error("Error: Demo repository has uncommitted changes. Please commit or stash them first.");
      process.exit(1);
    }

    const currentBranch = git("rev-parse --abbrev-ref HEAD", repoPath);
    if (currentBranch !== "main") {
      console.error(`Error: Demo repository is on branch '${currentBranch}', expected 'main'.`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Git error checking demo repository status:", err?.message ?? err);
    process.exit(1);
  }

  console.log("Reminder: If the previous demo incident is still active in Firebreak, resolve or dismiss it first — otherwise the new alert will attach to it.\n");

  // 2. git pull --ff-only
  try {
    console.log("Pulling latest main from origin...");
    git("pull --ff-only origin main", repoPath);
  } catch (err: any) {
    console.warn("Notice: git pull failed or origin not reachable, continuing with local HEAD:", err?.message ?? err);
  }

  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  console.log(`Generating 3 commits for demo run: ${runId}`);

  // Commit 1: docs: note on discounts
  const readmePath = path.join(repoPath, "README.md");
  fs.appendFileSync(readmePath, `\n- Discount note, run ${runId}\n`, "utf8");
  git("add README.md", repoPath);
  git(`commit -m "docs: note on discounts (run ${runId})"`, repoPath);
  console.log(`- Commit 1: docs: note on discounts (run ${runId})`);

  // Commit 2: refactor: support stacked discounts (THE BUG)
  const badTemplatePath = path.resolve(process.cwd(), "packages/fixtures/templates/pricing.bad.ts");
  if (!fs.existsSync(badTemplatePath)) {
    console.error(`Error: Template not found at ${badTemplatePath}`);
    process.exit(1);
  }
  const badContent = `// demo run ${runId}\n` + fs.readFileSync(badTemplatePath, "utf8");
  const targetPricingPath = path.join(repoPath, "lib", "pricing.ts");
  fs.mkdirSync(path.dirname(targetPricingPath), { recursive: true });
  fs.writeFileSync(targetPricingPath, badContent, "utf8");
  git("add lib/pricing.ts", repoPath);
  git(`commit -m "refactor: support stacked discounts (run ${runId})"`, repoPath);
  console.log(`- Commit 2: refactor: support stacked discounts (run ${runId}) [BAD COMMIT]`);

  // Commit 3: chore: refresh homepage copy
  const pagePath = path.join(repoPath, "app", "page.tsx");
  if (fs.existsSync(pagePath)) {
    let pageContent = fs.readFileSync(pagePath, "utf8");
    if (pageContent.includes("Build ")) {
      pageContent = pageContent.replace(/Build [0-9a-zA-Z_-]+/g, `Build ${runId}`);
    } else {
      pageContent += `\n// Build ${runId}\n`;
    }
    fs.writeFileSync(pagePath, pageContent, "utf8");
  } else {
    fs.mkdirSync(path.dirname(pagePath), { recursive: true });
    fs.writeFileSync(pagePath, `export default function Home() { return <div>Demo App — Build ${runId}</div>; }\n`, "utf8");
  }
  git("add app/page.tsx", repoPath);
  git(`commit -m "chore: refresh homepage copy (run ${runId})"`, repoPath);
  console.log(`- Commit 3: chore: refresh homepage copy (run ${runId})`);

  // 4. git push origin main
  console.log("\nPushing commits to origin main...");
  try {
    git("push origin main", repoPath);
    console.log("Pushed to GitHub successfully!");
  } catch (err: any) {
    console.error("Failed to push to GitHub origin main:", err?.message ?? err);
    process.exit(1);
  }

  // 5. Poll DEMO_HEALTH_URL until it returns 500 with new sha
  console.log(`\nWaiting for Vercel deployment to break production at ${healthUrl}...`);
  console.log("(Polling every 5s, max 180s)");

  const maxAttempts = 36; // 36 * 5s = 180s
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(8000) });
      const body: any = await res.json().catch(() => ({}));

      if (res.status === 500) {
        console.log(`\nSUCCESS: Production is broken! (HTTP 500)`);
        console.log(`- Observed SHA: ${body.sha ?? "unknown"}`);
        console.log(`- Error:        ${body.error?.type}: ${body.error?.message}`);
        console.log(`\nNext step: Fire the alert:`);
        console.log("  npm run fixture:fire\n");
        return;
      } else {
        process.stdout.write(`Attempt ${attempt}/${maxAttempts}: status ${res.status} (sha: ${body.sha?.slice(0, 7) ?? "..."})\r`);
      }
    } catch (err: any) {
      process.stdout.write(`Attempt ${attempt}/${maxAttempts}: connecting...\r`);
    }
  }

  console.log("\nWarning: Timeout waiting for health check to return 500. Check Vercel build status.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runBreak().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
}
