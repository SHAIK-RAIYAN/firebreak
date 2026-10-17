# 11 — Demo App + Alert Fixture (the "controlled fire")

> The MVP is proven with **real** GitHub commits, a **real** Vercel deployment, and a **controlled** alert.
> Nothing here is mocked: the bug is real, the 500 is real, the rollback is real, the recovery is real.
> Only the *alert source* is controlled (a CLI instead of Sentry), so the demo is repeatable.

---

## 1. Two repos

| Repo | What | Deployed where |
|---|---|---|
| `firebreak` | The product (monorepo: web + mcp + core). | Vercel (web) + free Node host (mcp) |
| `firebreak-demo` | A tiny Next.js shop API that we break on purpose. | Its **own** Vercel project (Hobby), linked to its own GitHub repo |

The demo repo **must** be a separate GitHub repo, so the GitHub App installation and Vercel Git integration behave exactly like they would for a real customer.

---

## 2. `firebreak-demo` — exact contents

Create with `pnpm create next-app firebreak-demo --ts --app --eslint --no-tailwind --src-dir=false --import-alias "@/*"`, then add only these files.

### 2.1 `lib/pricing.ts` (GOOD version — commit 1)

```ts
export type LineItem = { sku: string; unitPriceCents: number; quantity: number };

export function subtotalCents(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

export function applyDiscount(totalCents: number, discount?: { percent: number }): number {
  if (!discount) return totalCents;
  const pct = Math.min(Math.max(discount.percent, 0), 100);
  return Math.round(totalCents * (1 - pct / 100));
}

export function quote(items: LineItem[], discount?: { percent: number }) {
  const subtotal = subtotalCents(items);
  return { subtotalCents: subtotal, totalCents: applyDiscount(subtotal, discount) };
}
```

### 2.2 `app/api/health/route.ts`

The health check exercises real code paths (a "deep" health check), and on failure returns a **structured error with stack frames**. That body is what the fixture forwards as the alert.

```ts
import { NextResponse } from "next/server";
import { quote } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const SAMPLE = [
  { sku: "TEE-01", unitPriceCents: 2500, quantity: 2 },
  { sku: "CAP-02", unitPriceCents: 1800, quantity: 1 },
];

function parseFrames(stack = ""): { file: string; line: number; function: string }[] {
  // Lines look like: "    at applyDiscount (/var/task/.next/server/chunks/123.js:1:234)"
  // In dev and with source maps they look like ".../lib/pricing.ts:47:12".
  return stack
    .split("\n")
    .slice(1)
    .map((l) => l.trim().match(/^at (?:(.+?) \()?(.+?):(\d+):\d+\)?$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({ function: m[1] ?? "<anonymous>", file: m[2], line: Number(m[3]) }))
    .slice(0, 10);
}

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
  try {
    const q = quote(SAMPLE, { percent: 10 });
    if (q.totalCents !== 6120) throw new Error(`Pricing invariant failed: expected 6120, got ${q.totalCents}`);
    return NextResponse.json({ ok: true, sha, checks: { pricing: "ok" } });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      {
        ok: false,
        sha,
        error: { type: e.name, message: e.message, frames: parseFrames(e.stack) },
        // Explicit hint for symbolication-free environments (see §2.4):
        hint: { file: "lib/pricing.ts", function: "applyDiscount" },
      },
      { status: 500 },
    );
  }
}
```

Expected: `2500*2 + 1800 = 6800`, minus 10% = `6120`.

### 2.3 The BAD commit (commit 3 — message: `refactor: support stacked discounts`)

Replace `applyDiscount` with a version that crashes on the normal input:

```ts
export function applyDiscount(totalCents: number, discount?: { percent: number }): number {
  if (!discount) return totalCents;
  // BUG: assumes `discount.stack` always exists (it does not)
  const stacked = (discount as unknown as { stack: { percent: number }[] }).stack;
  const pct = stacked.reduce((acc, d) => acc + d.percent, discount.percent);
  return Math.round(totalCents * (1 - Math.min(pct, 100) / 100));
}
```

Result in production: `TypeError: Cannot read properties of undefined (reading 'reduce')` → `/api/health` returns 500.

### 2.4 Why the `hint` field exists

Production stack frames on Vercel point at bundled chunks (`/var/task/.next/server/chunks/...js`), not `lib/pricing.ts`. Real products solve this with source maps (Sentry). The MVP must not depend on source maps, so:

- The ranking algorithm (doc 03 §6) matches frames by **path suffix** *and* by **function name** found in the diff.
- The demo health route also returns `hint.file` / `hint.function`, which the fixture forwards as an extra frame with `"source": "hint"`. Firebreak treats hint frames exactly like stack frames but labels the evidence `from service hint`.

This keeps the demo honest: the evidence shown is "function `applyDiscount` was modified in this commit and appears in the error".

### 2.5 Commit history (real data for ranking)

Baseline commit `feat: pricing + health check` is pushed once by hand → deploy → confirm `/api/health` = 200.

Every demo run, `pnpm fixture:break` (§3) creates **three real commits** in the demo repo and pushes them in one push, so they land in one Vercel production deployment:

1. `docs: note on discounts (run <runId>)` (appends `- Discount note, run <runId>` to `README.md`)
2. `refactor: support stacked discounts (run <runId>)` (**the bug** — writes the bad `lib/pricing.ts` from §2.3 with a first line comment `// demo run <runId>`)
3. `chore: refresh homepage copy (run <runId>)` (sets the homepage subtitle string in `app/page.tsx` to `Build <runId>`)

`runId` = `new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)`. Every file change includes the run id, so **every run produces three non-empty commits**, even if the previous run was never reset. (`pricing.good.ts` likewise gets `// demo run <runId>` on reset.)

The compare range therefore has noise, and the ranking has to *work*: it must put commit 2 first, with evidence `lib/pricing.ts` + `applyDiscount`.

### 2.6 Vercel settings for the demo project

- Framework preset: Next.js. Production branch: `main`.
- **Deployment Protection:** leave default. Firebreak probes the **production domain** (e.g. `https://firebreak-demo.vercel.app/api/health`), which is public on Hobby. It never probes protected per-deployment URLs in the MVP.
- No env vars needed.

---

## 3. Alert fixture CLI (`packages/fixtures` in the `firebreak` repo)

### 3.1 Commands (root `package.json` scripts)

```jsonc
"fixture:break":  "tsx packages/fixtures/src/break.ts",
"fixture:fire":   "tsx packages/fixtures/src/fire.ts",
"fixture:reset":  "tsx packages/fixtures/src/reset.ts",
"fixture:static": "tsx packages/fixtures/src/fire.ts --static"
```

All scripts read `packages/fixtures/.env` (gitignored; template `packages/fixtures/.env.example`):

```dotenv
FIREBREAK_URL=https://firebreak.example.com     # or http://localhost:3000
FIREBREAK_SERVICE_ID=svc_...
FIREBREAK_ALERT_SECRET=whsec_...                 # shown once in the Service wizard
DEMO_REPO_PATH=../firebreak-demo                 # local clone of the demo repo
DEMO_HEALTH_URL=https://firebreak-demo.vercel.app/api/health
VERCEL_TOKEN=...                                 # only reset.ts uses it
VERCEL_PROJECT_ID=prj_...
VERCEL_TEAM_ID=                                  # empty for personal Hobby account
```

### 3.1a `break.ts` behaviour

1. Refuse to run if `DEMO_REPO_PATH` has uncommitted changes or is not on `main`. Print a reminder: "If the previous demo incident is still active, resolve or dismiss it first — otherwise the next alert attaches to it." (Fixtures have no session to check this themselves; `fire.ts` reports `deduped: true` when it happens.)
2. `git pull --ff-only`.
3. Create the 3 commits from §2.5 using `simple-git` (or `execa` + `git`), with exact file contents from §2.3. The bad `lib/pricing.ts` is stored as a template at `packages/fixtures/templates/pricing.bad.ts`; the good one at `pricing.good.ts`.
4. `git push origin main`.
5. Poll `DEMO_HEALTH_URL` every 5 s (max 180 s) until it returns 500 with a **new** `sha`; print "Production is broken at <sha>. Run pnpm fixture:fire".

### 3.2 `fire.ts` behaviour

Inputs (flags override `packages/fixtures/.env`): `--service <id>` (default `FIREBREAK_SERVICE_ID`), `--url <base url>` (default `FIREBREAK_URL`), `--secret <alert secret>` (default `FIREBREAK_ALERT_SECRET`), `--health <url>` (default `DEMO_HEALTH_URL`), `--static` (send `packages/fixtures/static-alert.json` instead of probing), `--force` (fire even if healthy). Missing required values → print which env var to set and exit 1.

Steps:
1. `GET` the health URL (timeout 8 s). If 2xx → print "Service is healthy — nothing to fire. Push the bad commit first." and exit 1 (unless `--force`).
2. Build the alert payload (schema in doc 06 §4):
   ```json
   {
     "fingerprint": "health:TypeError:applyDiscount",
     "title": "Health check failing: TypeError",
     "severity": "critical",
     "source": "fixture",
     "occurredAt": "<ISO now>",
     "error": { "type": "TypeError", "message": "...", "frames": [ ... , { "file": "lib/pricing.ts", "function": "applyDiscount", "line": null, "source": "hint" } ] },
     "observed": { "url": "<health url>", "status": 500, "sha": "<sha from body>" }
   }
   ```
   `fingerprint` = `health:${error.type}:${hint.function ?? frames[0].function}`.
3. Sign: `timestamp = Math.floor(Date.now()/1000)`, `signature = hex(HMAC_SHA256(secret, `${timestamp}.${rawBody}`))`.
4. `POST {url}/api/v1/alerts/{serviceId}` with headers
   `content-type: application/json`, `x-firebreak-timestamp: <timestamp>`, `x-firebreak-signature: v1=<signature>`.
5. Print the response (`202 { incidentId, deduped }`) and the incident URL `{url}/app/incidents/{incidentId}`. If `deduped: true`, print clearly: "Attached to an existing active incident — resolve or dismiss it in Firebreak to start a fresh one."

### 3.3 `reset.ts` behaviour (restore the demo for the next run)

1. In the **demo repo**: write `pricing.good.ts` over `lib/pricing.ts`, commit `fix: restore applyDiscount`, `git push`. This produces a fresh good deployment (the code history stays honest: the fix is a real commit).
2. After a Vercel rollback, Vercel stops auto-assigning production domains to new deployments until the rollback is undone. `reset.ts` therefore polls `GET /v7/deployments?projectId=…&target=production&sha=<new sha>&limit=5` until that deployment is `READY`, then **promotes it** with the same adapter the product uses (`@firebreak/core` → `vercelClient(...).promote(projectId, deploymentId)` → `POST /v10/projects/{projectId}/promote/{deploymentId}`, doc 03 §4.1 / 02 §9). If it was already auto-promoted (no rollback happened), skip the promote.
3. Polls the health URL until 200 with the new SHA, prints "Demo reset: healthy at <sha>".

Simpler manual alternative (document in README): Vercel dashboard → project → "Undo Rollback" / "Promote" the newest deployment.

### 3.4 `fixtures/static-alert.json`

A checked-in alert with realistic frames for offline development and for unit/integration tests. Used by `--static` and by `packages/core` tests.

---

## 4. Demo runbook (copy into the repo README)

```bash
# 0. once: demo deployed and healthy, Service created in Firebreak, packages/fixtures/.env filled
# 1. break production with 3 real commits (waits until /api/health returns 500)
pnpm fixture:break
# 2. fire the controlled alert (reads the real 500 body, signs it, posts it)
pnpm fixture:fire
# 3. open the printed incident URL → read suspects → Approve rollback → watch it verify
# 4. restore the demo (real fix commit + promote + wait for 200)
pnpm fixture:reset
```
