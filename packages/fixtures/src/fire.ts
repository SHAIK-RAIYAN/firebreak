import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { signAlert } from "@firebreak/core";

// Load environment variables
const fixturesEnvPath = path.resolve(process.cwd(), "packages/fixtures/.env");
if (fs.existsSync(fixturesEnvPath)) {
  dotenv.config({ path: fixturesEnvPath });
}
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--static") {
      flags.static = true;
    } else if (arg === "--force") {
      flags.force = true;
    } else if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      const key = arg.slice(2);
      const val = args[++i];
      if (val !== undefined) {
        flags[key] = val;
      }
    }
  }

  return flags;
}

export async function runFire(customFlags: Record<string, string | boolean> = {}) {
  const cliFlags = { ...parseArgs(), ...customFlags };
  if (cliFlags.help) {
    console.log(`
Usage: tsx packages/fixtures/src/fire.ts [options]

Options:
  --service <id>      Firebreak service ID (default: FIREBREAK_SERVICE_ID)
  --url <url>         Firebreak base URL (default: FIREBREAK_URL or http://localhost:3000)
  --secret <secret>   Service alert secret (default: FIREBREAK_ALERT_SECRET)
  --health <url>      Demo app health URL (default: DEMO_HEALTH_URL)
  --static            Use static-alert.json fixture instead of live probing
  --force             Fire alert even if health check returns 200 OK
`);
    process.exit(0);
  }

  const firebreakUrl =
    (cliFlags.url as string) ||
    process.env.FIREBREAK_URL ||
    "http://localhost:3000";

  const serviceId =
    (cliFlags.service as string) || process.env.FIREBREAK_SERVICE_ID;

  const alertSecret =
    (cliFlags.secret as string) || process.env.FIREBREAK_ALERT_SECRET;

  const healthUrl =
    (cliFlags.health as string) ||
    process.env.DEMO_HEALTH_URL ||
    "https://firebreak-demo.vercel.app/api/health";

  const isStatic = Boolean(cliFlags.static);
  const isForce = Boolean(cliFlags.force);

  if (!serviceId) {
    console.error("Error: Missing FIREBREAK_SERVICE_ID (provide via --service <id> or packages/fixtures/.env)");
    process.exit(1);
  }

  if (!alertSecret) {
    console.error("Error: Missing FIREBREAK_ALERT_SECRET (provide via --secret <secret> or packages/fixtures/.env)");
    process.exit(1);
  }

  let payload: Record<string, unknown>;

  if (isStatic) {
    console.log("Loading static alert fixture: packages/fixtures/static-alert.json");
    const staticPath = path.resolve(
      process.cwd(),
      "packages/fixtures/static-alert.json",
    );
    if (!fs.existsSync(staticPath)) {
      console.error(`Error: Static alert file not found at ${staticPath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(staticPath, "utf8");
    payload = JSON.parse(raw);
    payload.occurredAt = new Date().toISOString();
  } else {
    console.log(`Probing demo health check at ${healthUrl}...`);
    let res: Response;
    try {
      res = await fetch(healthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      console.error(`Failed to reach health URL (${healthUrl}):`, err);
      process.exit(1);
    }

    if (res.ok && !isForce) {
      console.log(
        `Service is healthy (${res.status} OK) — nothing to fire. Push the bad commit first (or pass --force).`,
      );
      process.exit(1);
    }

    let healthBody: any = {};
    try {
      healthBody = await res.json();
    } catch {
      // Body not JSON
    }

    const errorObj = healthBody.error || {
      type: "Error",
      message: `Health check failed with status ${res.status}`,
      frames: [],
    };

    const frames = Array.isArray(errorObj.frames) ? [...errorObj.frames] : [];
    if (healthBody.hint) {
      frames.push({
        file: healthBody.hint.file ?? "unknown",
        line: null,
        function: healthBody.hint.function ?? null,
        source: "hint",
      });
    }

    const topFunction =
      healthBody.hint?.function ??
      frames[0]?.function ??
      "unknown";

    const fingerprint = `health:${errorObj.type ?? "Error"}:${topFunction}`;

    payload = {
      fingerprint,
      title: `Health check failing: ${errorObj.type ?? "Error"}`,
      severity: "critical",
      source: "fixture",
      occurredAt: new Date().toISOString(),
      error: {
        type: errorObj.type ?? "Error",
        message: errorObj.message ?? "Health check error",
        frames,
      },
      observed: {
        url: healthUrl,
        status: res.status,
        sha: healthBody.sha,
      },
    };
  }

  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signAlert(alertSecret, timestamp, rawBody);

  const endpoint = `${firebreakUrl.replace(/\/$/, "")}/api/v1/alerts/${serviceId}`;
  console.log(`Sending signed alert to ${endpoint}...`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-firebreak-timestamp": String(timestamp),
      "x-firebreak-signature": signature,
    },
    body: rawBody,
  });

  const responseJson: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`Alert rejected with HTTP ${response.status}:`, responseJson);
    process.exit(1);
  }

  const data = responseJson.data;
  console.log(`\nAlert accepted! (${response.status})`);
  console.log(`- Alert ID:    ${data?.alertId}`);
  console.log(`- Incident ID: ${data?.incidentId}`);
  console.log(`- Deduped:     ${data?.deduped}`);
  console.log(`\nView Incident: ${firebreakUrl.replace(/\/$/, "")}/app/incidents/${data?.incidentId}`);

  if (data?.deduped) {
    console.log(
      "\nNote: Attached to an existing active incident — resolve or dismiss it in Firebreak to start a fresh one.",
    );
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runFire().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
}
