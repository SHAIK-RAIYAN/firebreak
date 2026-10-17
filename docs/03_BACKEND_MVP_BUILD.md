# 03 — Backend MVP Build (what to build first, exactly how)

> Big backend file #1 of 2. This file builds the **complete core loop** and nothing else.
> Prereqs: read 01, 02, 06, 07. Data shapes and routes are in 06; this file defines **behaviour**.
> Build in the order of the sections. Each section ends with **Verify** — do not continue until it passes.

---

## 0. Ground rules for backend code

1. **Business logic only in `packages/core`.** Next.js route handlers, Inngest functions and MCP tools call exactly one core service per operation.
2. **Every core service signature starts with a context object:** `fn(ctx: { workspaceId: string; actor: Actor }, input)` where `Actor = { type: "system" } | { type: "user"; userId: string } | { type: "mcp"; keyId: string; userId: string }`. (Alert intake + GitHub webhooks are the only exceptions; they resolve the workspace themselves.)
3. **No interactive DB transactions** (neon-http). Use single statements, `insert … on conflict`, and compare-and-set updates (`… where status = $expected returning *`).
4. **Every outbound HTTP call** has a timeout (`AbortSignal.timeout(ms)`) and goes through `withRetry` with an explicit `retryOn` predicate. Never retry 4xx except 409/429.
5. **Errors:** throw `AppError` (`code`, `status`, `message`, `details?`, `retriable?`). Unknown errors are wrapped as `INTERNAL`. Never put secrets in messages.
6. **Idempotency:** every function that can be re-run by Inngest must be safe to run twice (check state first, upsert, CAS).
7. **Timeline:** every state change writes at least one timeline event via `timeline.append(ctx, incidentId, type, summary, data)` (types in doc 06 §3.3 only).
8. **Pure functions are pure:** `ranking.ts`, `state.ts`, `preflight.ts` (`evaluatePreflight`), `fingerprint.ts`, `sanitize.ts` take plain data and return plain data. No I/O. 100% unit-tested.

---

## 1. `packages/core` package setup

`packages/core/package.json` (key fields):
```json
{
  "name": "@firebreak/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./db": { "types": "./dist/db/index.d.ts", "import": "./dist/db/index.js" },
    "./ai": { "types": "./dist/ai/index.d.ts", "import": "./dist/ai/index.js" }
  },
  "scripts": { "build": "tsup", "dev": "tsup --watch", "test": "vitest run", "typecheck": "tsc --noEmit", "db:generate": "drizzle-kit generate", "db:migrate": "drizzle-kit migrate" },
  "sideEffects": false
}
```
- `tsup.config.ts`: entries `src/index.ts`, `src/db/index.ts`, `src/ai/index.ts`; `format: ["esm"]`, `dts: true`, `target: "node22"`, `clean: true`, `sourcemap: true`.
- **Why top-level `main`/`types`:** the NitroStack app uses `moduleResolution: node`, which ignores `exports` (02 §8 G9). Anything `apps/mcp` imports must be reachable from the root entry (`@firebreak/core`) — so `src/index.ts` re-exports all services, the `db` factory, and AI analysis entrypoints too.
- Dependencies: `drizzle-orm@^0.45`, `@neondatabase/serverless@^1.2`, `zod@^4`, `nanoid`, `pino`, `@octokit/app@^16`, `inngest@^4`, `ai@^7`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/xai`, `ipaddr.js` (SSRF). Dev: `tsup`, `vitest`, `drizzle-kit`, `typescript`, `msw` (HTTP mocking in tests).
- Turbo: `build` depends on `^build`; `apps/web` and `apps/mcp` consume `dist/`.

**Verify:** `pnpm --filter @firebreak/core build && pnpm --filter @firebreak/core typecheck` pass; `apps/web` can `import { newId } from "@firebreak/core"`.

---

## 2. Database

### 2.1 Client — `src/db/client.ts`
```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function db() {
  if (!_db) _db = drizzle(neon(requireEnv("DATABASE_URL")), { schema });
  return _db;
}
```
Lazy init → no DB connection at import time (important for `next build`). `neon()` does not connect until the first query, but `requireEnv` throws if the var is missing — so CI builds set a **dummy** `DATABASE_URL=postgresql://build:build@localhost/build` (and dummy `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`), see doc 13 §3.2. Better Auth needs a db instance at module scope: pass `db()` and, if its `.d.ts` requires it, the Drizzle `schema` (`drizzleAdapter(db(), { provider: "pg", schema })`).

### 2.2 Schema + migrations
- Write `schema.ts` exactly per doc 06 §2 (Drizzle `pgTable`). Partial unique indexes via `uniqueIndex(...).on(...).where(sql\`status not in ('resolved','dismissed')\`)`.
- Generate Better Auth tables with `npx auth@latest generate` (Drizzle output) and paste them into `schema.ts` (keep Better Auth's names).
- `drizzle.config.ts` → `schema: "./src/db/schema.ts"`, `out: "./src/db/migrations"`, `dialect: "postgresql"`, `dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL }`.
- Migrations are committed. Applied with `pnpm db:migrate` locally, and **manually against prod before deploying code that needs them** (doc 13 §3.1). Never `drizzle-kit push` against prod.

### 2.3 Repos — `src/repo/*.ts`
One file per aggregate: `workspaces`, `integrations`, `services`, `alerts`, `incidents`, `suspects`, `analyses`, `actions`, `probes`, `timeline`, `mcpKeys`, `aiCredentials`, `usage`.
- First param is always `workspaceId` (except `services.getForAlertIntake(serviceId)` and `integrations.getByInstallationId(installationId)`).
- Return DTOs (no sealed columns) unless the function name ends with `WithSecret` (only services may call those).
- CAS helpers: `incidents.transition(ws, id, from: IncidentStatus | IncidentStatus[], to, patch?)` → returns updated row or `null`.

**Verify:** migration applies to a fresh Neon branch; a vitest integration test (skipped unless `DATABASE_URL_TEST` is set) inserts a workspace → service → incident and reads it back scoped; reading with another workspace id returns null.

---

## 3. Crypto + utilities

| File | Exports | Notes |
|---|---|---|
| `crypto/secrets.ts` | `seal`, `open`, `sealWith(aad, plaintext)`, `openWith(aad, sealed)` | doc 07 §3.2. Reads + validates `ENCRYPTION_KEY` **lazily on the first `sealWith`/`openWith` call** (then caches); throws with the var name if missing or not 32 bytes. Importing core never requires it (fixtures, build). |
| `util/env.ts` | `requireEnv(name)`, `optionalEnv(name, fallback)` | throws `Missing env var NAME` (never prints values) |
| `util/pmap.ts` | `pMap(items, fn, { concurrency })` | tiny concurrency limiter (no dependency) |
| `services/context.ts` | `systemCtx(workspaceId)`, `userCtx(workspaceId, userId)`, `mcpCtx(identity)` | builders for the `ctx` object of rule 2 |
| `crypto/hmac.ts` | `signAlert(secret, ts, rawBody)`, `verifyAlertSignature({secret, header, timestamp, rawBody, now})`, `verifyGithubSignature(secret, header, rawBody)`, `signState(obj)`, `verifyState(token)` | `timingSafeEqual` on equal-length buffers; return `false` (never throw) on malformed input. |
| `crypto/keys.ts` | `generateMcpKey()` → `{ key, prefix, hash }`; `hashKey(key)`; `generateAlertSecret()` → `whsec_` + 32 bytes base64url | sha256 hex for hashes. |
| `util/ids.ts` | `newId(prefix)` | nanoid 20, alphabet `0123456789abcdefghijklmnopqrstuvwxyz` |
| `util/retry.ts` | `withRetry(fn, { retries=2, baseMs=300, maxMs=3000, retryOn })` | exponential backoff + full jitter; honours `Retry-After` (seconds) when the error carries it |
| `util/logger.ts` | `logger` (pino) | **writes to stderr (fd 2) always** — stdout is reserved for the MCP stdio protocol; `redact: ["*.apiKey","*.token","*.authorization","*.secret","*.ciphertext","headers.authorization","headers.cookie","headers[\"x-firebreak-signature\"]"]` |
| `domain/errors.ts` | `AppError`, `isAppError`, error code union (06 §5) | |
| `util/time.ts` | `now()` (injectable clock for tests) | |

**Verify:** unit tests for seal/open (5 cases in doc 07 §3.2), HMAC (valid, wrong secret, stale timestamp, malformed header, length mismatch), state token (valid, expired, tampered).

---

## 4. Adapters (outbound)

### 4.1 Vercel — `adapters/vercel.ts`
```ts
export function vercelClient(opts: { token: string; teamId?: string | null }) {
  // base https://api.vercel.com ; adds Authorization; adds teamId query only if opts.teamId
  return {
    getUser(): Promise<{ username: string }>,
    listProjects(): Promise<VercelProject[]>,                       // GET /v9/projects?limit=100
    getProject(projectId): Promise<VercelProjectDetail>,           // GET /v9/projects/{id}
    getDeployment(id): Promise<DeploymentRef>,                      // GET /v13/deployments/{id}  (verify shape, 02 §9)
    listProductionDeployments(projectId, { rollbackCandidate?, limit? }): Promise<DeploymentRef[]>, // GET /v7/deployments
    getCurrentProduction(projectId): Promise<DeploymentRef>,       // algorithm in 02 §9
    getRollbackTarget(projectId, bad, knownBadIds): Promise<DeploymentRef | null>,
    rollback(projectId, deploymentId, description): Promise<{ status: number; body: unknown }>, // POST /v1/projects/{id}/rollback/{dep}
    promote(projectId, deploymentId): Promise<{ status: number }>, // POST /v10/projects/{id}/promote/{dep}
    getAliasJob(projectId): Promise<AliasJob | null>,              // from getProject().lastAliasRequest
  };
}
```
- Timeouts: 8 s reads, 15 s writes. Retry: 429/5xx/network, 2 retries. **Never retry `rollback()` automatically** inside the adapter (the caller decides; see §9.4).
- Map responses to `DeploymentRef` (06 §2.13): `id=uid`, `url="https://"+url`, `sha=meta.githubCommitSha ?? null`, `createdAt=new Date(created).toISOString()`, `state=readyState ?? state`, `branch=meta.githubCommitRef ?? null`.
- Error mapping → `AppError(code, …, { reason })` using the **top-level codes of doc 06 §5** with a `details.reason`: 401/403 → `UPSTREAM_ERROR` reason `VERCEL_UNAUTHORIZED` (not retriable), 402 → `UPSTREAM_ERROR` reason `VERCEL_PLAN_LIMIT`, 404 → `NOT_FOUND` reason `VERCEL_NOT_FOUND`, 409 → `CONFLICT` reason `VERCEL_CONFLICT` (retriable), 422 → `UPSTREAM_ERROR` reason `VERCEL_REJECTED`, 429/5xx/network → `UPSTREAM_ERROR` reason `VERCEL_UNAVAILABLE` (retriable). Keep Vercel's `error.message` in `details.vercelMessage` (not secret). GitHub maps the same way (`GITHUB_FORBIDDEN`, `GITHUB_NOT_FOUND`, `GITHUB_UNAVAILABLE`). **Everywhere else in this doc, names like `VERCEL_CONFLICT` mean `err.details.reason`.** Expose a helper `reasonOf(err)`.
- **First real call in dev:** log the raw JSON of `getProject` and one deployment to confirm `targets.production` and `meta.githubCommitSha`; record in `CONTEXT.md` §4.

### 4.2 GitHub — `adapters/github.ts`
```ts
export function githubApp() { /* singleton App from GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET */ }
export async function githubForInstallation(installationId: number) {
  const octokit = await githubApp().getInstallationOctokit(installationId);
  return {
    listRepos(): Promise<RepoRef[]>,                                // GET /installation/repositories (paginate, max 300)
    getRepo(owner, repo): Promise<RepoRef>,                          // GET /repos/{o}/{r}
    compare(owner, repo, base, head): Promise<{ status: "ahead"|"behind"|"identical"|"diverged"; commits: CommitRef[] }>,
    getCommitFiles(owner, repo, sha): Promise<CommitFile[]>,          // GET /repos/{o}/{r}/commits/{sha} → files (≤ 300)
  };
}
export async function verifyInstallation(installationId: number) // GET /app/installations/{id} with app JWT → account, repository_selection, suspended_at
```
- `compare` returns commits **newest first** (GitHub returns oldest first — reverse). Keep max 20 newest; set `truncated: true` if more.
- `CommitFile = { path, status, additions, deletions, patch: string | null, previousPath: string | null }`.
- Retry 5xx/429/network, 2 retries; 404 → `GITHUB_NOT_FOUND`; 401/403 → `GITHUB_FORBIDDEN` (installation removed or repo not granted).

### 4.3 Probe — `adapters/probe.ts`
`probe(url, { expectedStatus, timeoutMs = 8000 })` → `{ ok, httpStatus, latencyMs, observedSha, error }`:
- `fetch(url, { method: "GET", redirect: "manual", cache: "no-store", headers: { "cache-control": "no-cache", "user-agent": "FirebreakProbe/1.0" }, signal: AbortSignal.timeout(timeoutMs) })`.
- Read ≤ 64 KB of body; if JSON with string `sha` → `observedSha`.
- `ok = httpStatus === expectedStatus` (and see §9.5 for sha check). Never throws; network errors → `{ ok:false, error:"timeout"|"network"|"dns"|"tls" }`.
- SSRF guard (`adapters/ssrf.ts`) is applied when a **user** enters a URL (service create/edit, health-check endpoint). Probes reuse the stored, already-validated URL but still use `redirect: "manual"`.

**Verify:** adapter unit tests with `msw` for: current-production algorithm (all 3 branches), rollback-target selection (skips same sha, newer, known-bad), error mapping, compare reversal + truncation, probe sha extraction.

---

## 5. Services part 1 — workspace, integrations, services

`src/services/workspace.ts`
- `ensureWorkspaceForUser(user)` → returns workspace; `insert into workspaces … on conflict (owner_user_id) do nothing` (unique index, doc 06 §2.1), then `select … where owner_user_id = $user`; then `insert into workspace_members … on conflict (workspace_id, user_id) do nothing`. Safe under parallel first requests. Called from Better Auth `databaseHooks.user.create.after` **and** lazily from `requireSession` (belt and braces).
- GitHub login: configure Better Auth `user.additionalFields.githubLogin` (string, optional) and `socialProviders.github.mapProfileToUser: (profile) => ({ githubLogin: profile.login })` (verify both option names in Better Auth's `.d.ts`); workspace default name `${githubLogin ?? name}'s workspace`.

`src/services/integrations.ts`
- `startGithubInstall(ctx)` → URL `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new?state=${signState({ ws, nonce, exp: now+600 })}`.
- `completeGithubInstall(ctx, { installationId, code, state })` — **ownership must be proven, not just existence** (a signed state only proves who started a flow; an attacker could swap in someone else's `installation_id`):
  1. The GitHub App has **"Request user authorization (OAuth) during installation"** enabled (doc 12 A2), so GitHub redirects to the callback with `code` + `installation_id` (+ our `state` when the flow started in Firebreak).
  2. If `state` is present → `verifyState` (ws must equal `ctx.workspaceId`). If absent (install started on github.com) → allowed, ownership is still proven by step 3.
  3. Exchange `code` at `POST https://github.com/login/oauth/access_token` with `GITHUB_APP_CLIENT_ID`/`GITHUB_APP_CLIENT_SECRET` → user-to-server token → `GET /user/installations` (paginate) → the `installation_id` **must** be in that list. Otherwise 403 `FORBIDDEN` reason `INSTALLATION_NOT_ACCESSIBLE`. Missing `code` → redirect to `/app/integrations?error=reconnect` ("Reconnect from Firebreak").
  4. `verifyInstallation` (App JWT) for account/selection/suspension details → upsert `github_installations` (if the id already belongs to **another** workspace → 409 `CONFLICT` reason `INSTALLATION_CLAIMED`). Discard the user token (never stored).
- `startGithubLink(ctx)` → `https://github.com/login/oauth/authorize?client_id=${GITHUB_APP_CLIENT_ID}&state=${signState(...)}` for installations created outside Firebreak (org-owner approvals, installs from github.com). Callback with `code` and **no** `installation_id` → exchange → `GET /user/installations` → return the list (excluding ones claimed by other workspaces) → user picks → upsert each via step 4. Routes: `GET /integrations/github/link` (302 to GitHub); the callback (no `installation_id`) stores the user token **sealed** in a 5-minute `httpOnly`, `Secure`, `SameSite=Lax` cookie and redirects to `/app/integrations?link=1`, where the UI calls `GET /integrations/github/link/candidates` → `[{ githubInstallationId, accountLogin, accountType }]` and `POST /integrations/github/link` `{ installationIds: number[] }` (each re-checked against the token's `/user/installations`). Cookie is deleted after the POST.
- Repo lists are always fetched live with the installation token (`GET /installation/repositories`), so repo-selection changes made later on GitHub need no callback.
- `handleGithubWebhook(rawBody, headers)` → verify signature → dedupe by `x-github-delivery` (`processed_webhooks`) → `installation.deleted` → delete row (services referencing it keep working until trace fails with `GITHUB_FORBIDDEN`; UI shows reconnect); `suspend/unsuspend` → set/clear `suspended_at`; others → no-op.
- `connectVercel(ctx, { token, teamId })` → `getUser()` (+ `listProjects()` to confirm team access) → seal with AAD `${ws}:vercel` → upsert.
- `listVercelProjects(ctx)` → decrypt token → `listProjects()` → map (include `link.repo` so the wizard can auto-match the chosen GitHub repo).

`src/services/services.ts`
- `createService(ctx, input)`:
  1. Zod-validate. `healthUrl` SSRF-check (https in prod).
  2. Check the installation belongs to ctx workspace and `getRepo(owner, repo)` succeeds (repo granted to the App).
  3. Check the Vercel project exists via the workspace token.
  4. Generate alert secret, seal with AAD `${ws}:alert:${serviceId}`.
  5. Insert. Return `{ service, alertSecret }` (plaintext secret only here).
- `rotateAlertSecret`, `updateService`, `archiveService`, `listServices` (with active incident join), `checkHealthUrl(ctx, url)` (SSRF + probe).

`src/services/mcpKeys.ts`
- `createMcpKey(ctx, { name, scopes })` → `generateMcpKey()` → store `prefix` + `key_hash` → return `{ key, record }` (plaintext once). `incidents:read` is always included.
- `revokeMcpKey(ctx, id)`, `listMcpKeys(ctx)`.
- `validateMcpKey(raw)` → `Identity | null` (used by the MCP guard; not workspace-scoped because the key *is* the scope).

**Verify:** with real credentials in dev: install the App on the demo repo, connect a Vercel token, create the demo Service via `curl`/REST client; DB rows correct; secrets are ciphertext in DB.

### 5.1 Read models (shared by web pages, `/api/v1` GETs and MCP tools) — `src/services/views.ts`

One function per screen/tool so web and MCP render the **same** data:
| Function | Used by |
|---|---|
| `resolveIncidentRef(ctx, ref)` → incident id from `inc_…` or a number / `INC-12` | MCP tools, ⌘K |
| `getIncidentDetail(ctx, id)` → `IncidentDetail` (06 §5.4) — 6 queries in `Promise.all` | `GET /incidents/{id}`, incident room |
| `getIncidentCard(ctx, ref)` → compact card (05 §6) | MCP `get_incident` |
| `listIncidentsView(ctx, { status, serviceId, limit, cursor })` | list page, MCP `list_incidents`, overview |
| `getSuspectsView(ctx, ref, limit)` | MCP `get_suspects` |
| `getAnalysisView(ctx, ref)` | MCP `get_analysis` |
| `getTimelineView(ctx, ref, limit)` | MCP `get_timeline` |
| `getActionStatusView(ctx, { actionId?, incidentRef? }, { appBaseUrl })` → `ActionStatus` (06 §5.7) incl. `approveUrl` — caller passes `appBaseUrl` (`FIREBREAK_APP_URL` in MCP, `NEXT_PUBLIC_SITE_URL` in web) | MCP `get_action_status`, `propose_rollback`, `approve_action` |
| `listServicesView(ctx)` | services page, MCP `list_services` |
| `getOverviewStats(ctx)` → active count, median time-to-recover (30 d, from `resolved_at - opened_at` of `closed_reason='verified'`), verified rollbacks (30 d) | overview |

Views never return sealed columns or raw rows; dates are ISO strings.

---

## 6. Suspect ranking — `src/domain/ranking.ts` (the heart; pure function)

### 6.1 Inputs / outputs
```ts
type Frame = { file: string; line: number | null; function: string | null; source: "stack" | "hint" };
type CommitInput = { sha: string; message: string; authorLogin: string | null; authorName: string; committedAt: string; htmlUrl: string; parents: number; files: CommitFile[] };
type RankInput = { frames: Frame[]; errorMessage: string | null; commits: CommitInput[] /* newest first */ };
type RankedSuspect = { sha: string; rank: number; points: number; score: number; evidence: Evidence[]; files: SuspectFile[] };
export function rankSuspects(input: RankInput): { suspects: RankedSuspect[]; confidence: "high" | "low" };
```

### 6.2 Normalisation
- `normalizePath(p)`: strip `webpack-internal:///`, `webpack://`, `file://`, leading `(rsc)/`, `(ssr)/`, `(app-pages-browser)/`, `/var/task/`, `/vercel/path0/`, `./`, query/hash, leading `/`; collapse `\` to `/`.
- Ignore frames whose normalized path contains `node_modules/` or starts with `node:` or `internal/` (they never match repo files).
- `isMeaningfulSymbol(fn)`: length ≥ 3, not `<anonymous>`, `anonymous`, `Object.<anonymous>`, `async`, not all lowercase single-word ≤ 2 chars, not purely minified (`/^[a-zA-Z_$]{1,2}$/`). Strip `Module.`, `Object.`, `async ` prefixes; keep last segment after `.`.
- Error tokens: identifiers inside quotes in the error message (`/'([A-Za-z_$][\w$]{2,})'/g`) and after `reading `.

### 6.3 Patch parsing
`parseHunks(patch)` → `[{ newStart, newLines, oldStart, oldLines, addedLines: string[], removedLines: string[], header }]` from `@@ -a,b +c,d @@ header`.

### 6.4 Scoring (points per commit; deterministic)
For each commit and each changed file `f` (skip if commit has `parents > 1` → merge commit: points 0, evidence "merge commit"):

| Rule | Points | Cap | Evidence kind |
|---|---|---|---|
| Normalized frame path **equals** `f.path` | +40 | 2 files | `file_exact` |
| Frame path **ends with** `/` + `f.path` or `f.path` ends with `/` + frame path, with ≥ 2 path segments in common | +30 | 2 files | `file_suffix` |
| Only basenames equal (e.g. `pricing.ts`) | +10 | 1 file | `file_basename` |
| A frame with this file has `line` inside a hunk's new range ±3 | +25 | 1 | `line_in_hunk` |
| A meaningful frame symbol appears as a whole word in a hunk of any file in the commit: in `addedLines`/`removedLines`, in **context lines** of that hunk, in the hunk header, or as the **nearest enclosing declaration** above the first changed line (scan the hunk's lines upward for `function <name>`, `const <name> =`, `<name>(…) {`, `class <name>`, `export … <name>`) | +25 | 1 | `symbol` |
| An error token appears in `addedLines` | +10 | 1 | `error_token` |
| File is risky: `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `next.config.*`, `vercel.json`, `middleware.*`, `proxy.*`, `.env*`, `*.sql`, `prisma/schema.prisma`, `drizzle/**` | +8 | 1 | `risky_file` |
| Recency (position i in newest-first list) | `max(0, 5 - i)` | — | `recency` (only if > 0) |

Hint frames (`source: "hint"`) score exactly like stack frames; evidence label adds "(service hint)".

- `score = min(1, points / 100)` (display only).
- Sort: `points desc`, then `committedAt desc`, then `sha asc`. `rank = index + 1`.
- `confidence = "high"` if the top suspect has any `file_*` or `symbol` evidence, else `"low"`.
- Evidence ids: `ev_${rank}_${n}` (stable, deterministic).
- Labels are short human strings, e.g. `lib/pricing.ts matches stack frame #1`, `applyDiscount changed (frame function)`, `reads 'reduce' in added line`.

### 6.5 Required unit tests (`test/ranking.test.ts`)
1. Demo case: 3 commits, bad one ranks #1 with `file_exact` (+40, hint frame `lib/pricing.ts`) + `symbol` (+25, `applyDiscount` is the enclosing declaration / a context line — git's hunk header for this change is `export function subtotalCents…`, so header-only matching would miss it) + `error_token` (+10, `reduce`) + `recency` → **79 points**. The commit data (messages, files, real unified-diff patches produced by `git diff` of the templates in doc 11) lives inline in `packages/core/test/fixtures/demo.ts` so this test runs in M2, before `packages/fixtures` exists.
2. Bundled-only frames (`/var/task/.next/server/chunks/412.js`, fn `a`) and no hint → falls back to recency + risky; `confidence = "low"`.
3. Suffix match: frame `/vercel/path0/src/lib/pricing.ts` vs file `src/lib/pricing.ts`.
4. Line in hunk: frame line 47, hunk `+40,12` → +25.
5. Merge commit gets 0.
6. Determinism: shuffled input order → identical output.
7. Ties broken by committedAt then sha.

**Verify:** `pnpm --filter @firebreak/core test ranking` green.

---

## 7. Services part 2 — alert intake & trace

### 7.1 `ingestAlert({ serviceId, rawBody, headers })` — `services/alerts.ts`
Exactly doc 06 §4 "Processing". Additional rules:
- Load service with `getForAlertIntake` (not archived). Unknown → `NOT_FOUND` **after** a constant-time dummy HMAC to reduce timing differences.
- Rate limit `alert:${serviceId}` per minute (60) via `usage.increment`.
- Severity order `critical > high > medium > low`.
- On new incident: timeline `alert_received` + `incident_opened`; send `incident/opened`. If `inngest.send` throws → log error, still return 202 (the incident exists; the UI shows "Trace pending" with a **Retry trace** button → `POST /incidents/{id}/retrace`).

### 7.2 `traceIncident(ctx, incidentId)` — `services/trace.ts`
1. Load incident + service + connections. Missing Vercel connection → mark `trace_status='failed'`, `trace_error='vercel_not_connected'`, timeline `trace_failed`, status `open → triaged`. Return.
2. `bad = vercel.getCurrentProduction(projectId)`; timeline `deployments_resolved`. If the first alert has `observed.sha` and it differs from `bad.sha` → add `data.shaMismatch` (do not fail).
3. `knownBad` = bad deployment ids of earlier incidents of this service. `good = vercel.getRollbackTarget(projectId, bad, knownBad)`.
4. If `good` and both SHAs present → `github.compare(owner, repo, good.sha, bad.sha)`; for each of ≤ 20 commits → `getCommitFiles` (concurrency 5, via a small `pMap`). Else commits = [].
5. `rankSuspects({ frames, errorMessage, commits })` with frames from **all** alerts of the incident (dedupe by `file+line+function`, max 30).
6. Upsert suspects (`on conflict (incident_id, sha) do update`), keep top 10. For matched files of the top 5, store `patchExcerpt`: the hunks containing matched lines/symbols (fallback: first hunks), max 60 lines, passed through the secret scrubber (doc 07 §5). This is what the UI `DiffBlock` and the AI bundle read — no later GitHub refetch.
7. Update incident: `bad_deployment`, `good_deployment`, `trace_status='ready'`, `trace_confidence`. Transition `[open, triaged] → triaged` (CAS; "already triaged" on a retrace counts as success; any other status → leave status alone, data still updated). Timeline `trace_started` at step 1 and `suspects_ranked` here (summary: "Ranked 3 commits; top: 9f1c2e7 refactor: support stacked discounts").
8. Return `{ hasTarget: Boolean(good) }`.

Errors: `VERCEL_UNAUTHORIZED` → set `vercel_connections.status='invalid'`, trace failed `vercel_unauthorized` (non-retriable). `GITHUB_FORBIDDEN/NOT_FOUND` → trace failed `github_access` (non-retriable). Retriable errors are re-thrown for Inngest to retry; after final retry, the function's `onFailure` sets trace failed `upstream_unavailable`.

**Verify:** run `pnpm fixture:static` against local web (with Inngest Dev Server) using the real demo service → suspects appear in DB with correct ranking.

---

## 8. Services part 3 — analysis (summary; full spec in doc 07)

`analyzeIncident(ctx, incidentId, attempt)` → resolves key (07 §2.2) → builds bundle (07 §5) → `generateText` with `Output.object` → sanitize (07 §6.1) → save. Never throws to the caller: returns `{ status }`. Runs in its own Inngest function so it never delays the proposal.

---

## 9. Services part 4 — the action lifecycle

### 9.1 Preflight — `domain/preflight.ts` (pure)
```ts
evaluatePreflight({ target, current, from, knownBadIds, now, expiresAt, latestProbe }): PreflightCheck[]
```
| id | blocking | ok when |
|---|---|---|
| `target_ready` | yes | `target.state === "READY"` |
| `target_differs` | yes | `target.id !== current.id` and (`target.sha !== current.sha` or either is null) |
| `target_not_known_bad` | yes | `!knownBadIds.includes(target.id)` |
| `no_drift` | yes | `current.id === from.id` (production unchanged since proposal) — at proposal time `from = current`, so it is trivially ok |
| `not_expired` | yes | `now < expiresAt` (at proposal time: ok) |
| `still_failing` | **no** (warning) | latest probe of `health_url` is not ok. If it is healthy: `ok=false`, detail "Service looks healthy right now — rollback may be unnecessary" |

Add `blocking: boolean` to each check object. `canExecute = checks.filter(c => c.blocking).every(c => c.ok)`.

### 9.2 `proposeRollback(ctx, incidentId, proposedBy)` — `services/actions.ts`
1. **Idempotency first:** if the incident already has a live action (`proposed|awaiting_approval|approved|executing|verifying`) → return it with `proposed: false, existing: true` (no error). Then: incident must be in `triaged` or `mitigation_failed` and have `good_deployment`; else `CONFLICT` with reason (`INVALID_STATE` / `NO_ROLLBACK_TARGET`).
2. `current = getCurrentProduction()`; `latestProbe = probe(health_url)` (one probe, 8 s).
3. `checks = evaluatePreflight(...)` with `from = current`, `target = incident.good_deployment` re-fetched via `getDeployment` (fresh state).
4. Blocking failure → insert action `status='cancelled'`, `error_code='preflight_failed'`, timeline `preflight_failed`; return `{ action, proposed: false }` (HTTP 412 for manual proposals).
5. Else insert action `awaiting_approval`, `expires_at = now + 15 min` (`ACTION_APPROVAL_TTL_MIN`). Unique violation (live action exists) → return the existing live action.
6. Incident CAS `[triaged, mitigation_failed] → awaiting_approval`. Timeline `action_proposed` ("Proposed rollback to 3ab9d04 (deployed 2h ago)").
7. `inngest.send("action/proposed", { actionId, workspaceId, expiresAt })`.

### 9.3 Decide — `approveAction` / `rejectAction`
`approveAction(ctx, actionId, { note, via: "web" | "mcp" })`:
1. If `via === "mcp"` → the calling key must have scope `actions:approve` (else `FORBIDDEN`).
2. CAS: `update actions set status='approved', decided_by_user_id=$user, decided_via=$via, decided_at=now(), decision_note=$note where id=$id and workspace_id=$ws and status='awaiting_approval' and expires_at > now() returning *`.
3. 0 rows → reload: `expires_at <= now` and still `awaiting_approval` → CAS to `expired` + incident back to `triaged` + timeline → throw `PRECONDITION_FAILED (ACTION_EXPIRED)`; otherwise `CONFLICT (INVALID_STATE, currentStatus)`.
4. Incident CAS `awaiting_approval → mitigating`. Timeline `action_approved` (actor = user).
5. `inngest.send("action/approved", { actionId, workspaceId })` with `withRetry` (3). If still failing → CAS action back `approved → awaiting_approval`, incident `mitigating → awaiting_approval`, timeline `approval_dispatch_failed`, throw `UPSTREAM_ERROR` (HTTP 502, reason `DISPATCH_FAILED`, "Could not start execution, please try again").

`rejectAction` → CAS `awaiting_approval → rejected`, incident `→ triaged`, timeline `action_rejected`.

### 9.4 Execute — `executeAction(ctx, actionId)` (called from Inngest step "execute")
Returns `{ stop: boolean }` (the Inngest function stops when `stop` is true).
1. Load action + incident. If action status is `verifying|verified|verification_failed|failed|cancelled|rejected|expired` → return `{ stop: status !== "verifying" }` (idempotent re-run; `verifying` continues to confirm/probes).
2. If the incident is terminal (`resolved|dismissed`) → CAS `approved|executing → cancelled` (only if no Vercel call was made yet), timeline `action_cancelled`; return `{ stop: true }`.
3. If status `approved`: run preflight again with fresh `current` (drift + not_expired relative to `decided_at + 2 min` grace, not `expires_at`). Blocking failure → CAS `approved → cancelled` (`error_code='drift'` or the failing id), incident `mitigating → triaged`, timeline `action_cancelled` ("Production changed since approval — cancelled. Re-propose to continue."). Return `{ stop: true }`. Else CAS `approved → executing` setting `execution_started_at = now()`; timeline `action_executing`.
4. If status is `executing` (a retry after a crash), continue here. **Never roll back twice:** if `vercel_response` is set → return `{ stop: false }` (go on to confirm). Else check `getAliasJob(projectId)`: if `type === "rollback"`, `toDeploymentId === target.id` and `requestedAt >= execution_started_at` → the call already happened; record `vercel_response = { inferred: true }` and return `{ stop: false }`.
5. `vercel.rollback(projectId, target.id, "Firebreak INC-<n>: <title>")`.
   - 2xx → save `vercel_response`, `executed_at`; timeline `action_executed`; return `{ stop: false }`.
   - `VERCEL_CONFLICT` (another rollback in progress) → throw retriable (Inngest retries the step with backoff, max 3).
   - `VERCEL_PLAN_LIMIT` / `VERCEL_REJECTED` / `VERCEL_UNAUTHORIZED` / `VERCEL_NOT_FOUND` → CAS `executing → failed` with `error_code` + Vercel message, incident `→ mitigation_failed`, timeline `action_failed`; throw `NonRetriableError`.

### 9.5 Confirm + verify
`confirmProduction(ctx, actionId)` → `{ stop: boolean }` (Inngest step "confirm", one step polls up to 45 s every 3 s). If the action is already `verifying` → `{ stop: false }`; if it is terminal → `{ stop: true }`.
- `job = getAliasJob(projectId)`; success when `job.type === "rollback" && job.toDeploymentId === target.id && job.jobStatus === "succeeded"` **and** `getCurrentProduction().id === target.id`. `jobStatus === "failed"` → CAS `executing → failed` (`vercel_job_failed`), incident → `mitigation_failed`, timeline `action_failed`, return `{ stop: true }`. Not done after 45 s → throw retriable; when Inngest retries are exhausted the function's **`onFailure`** marks it failed `vercel_confirm_timeout` (§10).
- On success: CAS `executing → verifying`, `verify_started_at`; incident `mitigating → verifying`; timeline `production_confirmed` ("Vercel now serves 3ab9d04").

`recordProbe(ctx, actionId, seq)` (one Inngest step per probe):
- If a probe with `(action_id, seq)` exists → return it (idempotent).
- `p = probe(health_url)`; if `p.observedSha` and `target.sha` → `ok = ok && (p.observedSha.startsWith(target.sha.slice(0, 7)) || target.sha.startsWith(p.observedSha))`.
- Insert probe. Compute `streak` = consecutive ok probes ending at this seq. Timeline `probe` only when ok-state flips or seq = 1.
- Return `{ ok, streak }`.

`finishVerification(ctx, actionId, verified: boolean)`:
- verified → CAS `verifying → verified`, `verify_finished_at`; incident `verifying → resolved` (`closed_reason='verified'`, `resolved_at`); timeline `verified` + `incident_resolved` ("Recovered: 3 healthy checks in a row").
- not verified → CAS `verifying → verification_failed`; incident `→ mitigation_failed`; timeline `verification_failed` ("Still failing after 3 minutes. Production is on 3ab9d04. Investigate manually.").

Constants (env-overridable): `VERIFY_REQUIRED_STREAK=3`, `VERIFY_MAX_PROBES=18`, `VERIFY_INTERVAL_S=10`.

### 9.6 Expire — `expireAction(ctx, actionId)`
CAS `awaiting_approval → expired` where `expires_at <= now()`; incident `awaiting_approval → triaged`; timeline `action_expired`. No-op if already decided.

### 9.7 Manual
- `resolveIncident(ctx, id, note)` → any non-terminal → `resolved` (`closed_reason='manual'`); cancel the live action if it is `awaiting_approval` **or `approved`** (CAS → `cancelled`). An action already `executing`/`verifying` is left to finish (it can't be un-called); `executeAction` step 2 also aborts on a terminal incident.
- `dismissIncident(ctx, id, note)` → same with `dismissed`.
- `retraceIncident(ctx, id)` → allowed when `trace_status='failed'`, **or** `trace_status='pending'` and `opened_at < now() - 60 s` (event dispatch was lost) → set `pending`, send `incident/retrace`. Otherwise `CONFLICT` reason `TRACE_IN_PROGRESS`.
- `retryAnalysis(ctx, id)` → next `attempt` = max(attempt)+1 (≤ 3, else `CONFLICT` reason `ANALYSIS_ATTEMPTS_EXHAUSTED`) → insert `analyses` row `pending` → send `incident/analysis.requested`.

**Verify (end of §9):** unit tests for preflight + both state machines (every row of doc 06 §3 tables, plus invalid transitions throw). Integration (local, real demo): fixture break → fire → approve via REST → rollback happens on Vercel → probes go green → incident resolved. **This is the MVP backend milestone.**

---

## 10. Inngest functions — `apps/web/src/inngest/functions/*.ts`

Client + typed events live in `packages/core/src/inngest/{client,events}.ts` (shared with `apps/mcp`).

| Function id | Trigger | Options | Steps |
|---|---|---|---|
| `incident-pipeline` | `incident/opened` | `concurrency: { key: "event.data.incidentId", limit: 1 }`, `idempotency: "event.data.incidentId"`, `retries: 3`, `onFailure` → trace failed | `trace` → if hasTarget: `propose` → `sendEvent("incident/traced")` (send traced even without target) |
| `incident-retrace` | `incident/retrace` | concurrency per incident, retries 3, **same `onFailure`** as pipeline | same as pipeline |
| `incident-analysis` | `incident/traced` **and** `incident/analysis.requested` (v4: `triggers: [{ event: "incident/traced" }, { event: "incident/analysis.requested" }]` — verify array support in the `.d.ts`; otherwise two functions sharing one handler) | `retries: 1`, concurrency per incident 1 | `analyze` (attempt = `event.data.attempt ?? 1`) |
| `action-expiry` | `action/proposed` | — | `step.sleepUntil("until-expiry", event.data.expiresAt)` → `expire` |
| `action-execute` | `action/approved` | `concurrency: { key: "event.data.actionId", limit: 1 }`, `idempotency: "event.data.actionId"`, `retries: 3`, **`onFailure`**: CAS `approved\|executing → failed` (`error_code` = last error reason or `vercel_confirm_timeout`), incident `mitigating → mitigation_failed`, timeline `action_failed`. If the action is already `verifying` when it fails → `verification_failed` instead. | `execute` → `confirm` → loop `i=1..18`: `step.sleep("wait-"+i, i === 1 ? "5s" : "10s")`, `step.run("probe-"+i)`; break at streak 3 → `finish` |

Event payloads (all in `packages/core/src/inngest/events.ts`, Zod-typed, ids only — also listed in doc 06 §3.4).

```ts
export const actionExecute = inngest.createFunction(
  { id: "action-execute", triggers: { event: "action/approved" }, concurrency: { key: "event.data.actionId", limit: 1 }, idempotency: "event.data.actionId", retries: 3 },
  async ({ event, step }) => {
    const ctx = systemCtx(event.data.workspaceId);
    const exec = await step.run("execute", () => executeAction(ctx, event.data.actionId));
    if (exec.stop) return exec;
    const conf = await step.run("confirm", () => confirmProduction(ctx, event.data.actionId));
    if (conf.stop) return conf;
    let verified = false;
    for (let i = 1; i <= VERIFY_MAX_PROBES; i++) {
      await step.sleep(`wait-${i}`, i === 1 ? "5s" : `${VERIFY_INTERVAL_S}s`);
      const p = await step.run(`probe-${i}`, () => recordProbe(ctx, event.data.actionId, i));
      if (p.streak >= VERIFY_REQUIRED_STREAK) { verified = true; break; }
    }
    return step.run("finish", () => finishVerification(ctx, event.data.actionId, verified));
  },
);
```
- `step.run` return values must be JSON-serializable (no Dates — use ISO strings).
- `apps/web/src/app/api/inngest/route.ts` sets `export const maxDuration = 60`.
- Events never contain secrets; only ids.

---

## 11. Web API layer — `apps/web/src/lib/api.ts`

```ts
export function route<T>(handler: (req: NextRequest, c: { session: SessionCtx; params: Record<string,string> }) => Promise<T>, opts?: { auth?: "session" | "none"; status?: number }) {
  return async (req: NextRequest, { params }: { params: Promise<Record<string,string>> }) => {
    const requestId = req.headers.get("x-request-id") ?? newId("req");
    try {
      const session = opts?.auth === "none" ? null : await requireSession(req);   // 401 AppError if missing
      const data = await handler(req, { session: session!, params: await params });
      return NextResponse.json({ data }, { status: opts?.status ?? 200, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
    } catch (e) { return errorResponse(e, requestId); }   // AppError → envelope; ZodError → 422; else 500 + log
  };
}
```
- `requireSession(req)` → Better Auth `getSession` → `ensureWorkspaceForUser` → `{ user, workspaceId, actor: { type: "user", userId } }`.
- **CSRF guard:** for every non-GET request with `auth: "session"`, reject with 403 `FORBIDDEN` unless the `Origin` header equals `new URL(NEXT_PUBLIC_SITE_URL).origin`. (Alert intake and GitHub webhooks use `auth: "none"` and their own signatures.)
- Route params in Next 16 are a **Promise** (`await params`).
- All `/api/v1/*` handlers use `runtime = "nodejs"` (crypto, Octokit). Alerts route reads `await req.text()` first.
- `src/proxy.ts`: for `/app/:path*`, if no session cookie (`getSessionCookie(request)` from `better-auth/cookies`) → redirect `/login?next=…`. This is optimistic only; every handler still calls `requireSession`.

---

## 12. Performance budget (backend)

| Path | Target | How |
|---|---|---|
| `POST /alerts/*` | p95 < 400 ms | 4–6 queries, no external calls except `inngest.send` |
| `GET /incidents/{id}` (polled every 2 s) | p95 < 250 ms | 6 queries in `Promise.all` (incident, suspects, latest analysis, live action, probes, last 100 timeline events); indexes from 06; `cache-control: no-store` |
| `GET /incidents` | p95 < 200 ms | keyset pagination, index `(workspace_id, status, opened_at desc)` |
| Trace (alert → suspects) | p95 < 10 s | parallel commit fetches (5), ≤ 20 commits |

Neon cold start (≈ few hundred ms after 5 min idle) is acceptable; do not add keep-alive pings.

---

## 13. Backend "done" checklist

- [ ] All unit tests green (crypto, hmac, ranking, preflight, state machines, sanitizer, adapters with msw).
- [ ] Demo loop passes locally (Inngest Dev Server) and in production (Inngest Cloud).
- [ ] Every `/api/v1` route returns the 06 envelope; 401 without session; other-workspace ids → 404.
- [ ] Invalid alert signature → 401; replay after 5 min → 401; duplicate `id` → 200 `deduped: true`.
- [ ] Double-click Approve → exactly one Vercel rollback call (check logs + `vercel_response`).
- [ ] Kill the dev server mid-execution → Inngest retry resumes without a second rollback.
- [ ] No secret appears in logs (grep logs for `fbk_`, `whsec_`, `sk-`, the Vercel token).
