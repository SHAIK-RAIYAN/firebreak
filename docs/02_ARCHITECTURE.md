# 02 — Architecture, Tech Stack, Repo Layout, Verified Facts

> Read after 01. This is the map. Docs 03–07 are the detailed specs for each box in this map.

---

## 1. System diagram

```
                         ┌────────────────────────── MCP clients ──────────────────────────┐
                         │  NitroStudio (local, stdio)   Claude Code / Cursor / Claude (HTTP) │
                         └───────────────┬──────────────────────────────┬──────────────────┘
                                         │ stdio (dev)                  │ Streamable HTTP  POST /mcp
                                         │                              │ Authorization: Bearer fbk_…
                              ┌──────────▼──────────────────────────────▼──────────┐
                              │  apps/mcp  — NitroStack MCP server (long-running)   │
                              │  tools · widgets (ui://widget/*.html) · McpKeyGuard │
                              │  host: Northflank free (Docker), 1 instance         │
                              └──────────┬─────────────────────────────┬────────────┘
                                         │ imports                     │ inngest.send()
┌──────────────┐  HTTPS   ┌──────────────▼─────────────────────────────▼────────────┐
│   Browser    ├─────────►│  apps/web — Next.js 16 on Vercel Hobby                   │
│ marketing +  │◄─────────┤  • marketing pages (static, SEO)                          │
│ app (/app/*) │ polling  │  • /api/v1/* REST (session auth)                          │
└──────────────┘          │  • /api/v1/alerts/{svc}  (HMAC)  ◄──── alert fixture CLI  │
                          │  • /api/v1/integrations/github/webhook ◄── GitHub App     │
                          │  • /api/inngest  (workflow functions) ◄──► Inngest Cloud  │
                          └──────────────┬───────────────────────────────────────────┘
                                         │ imports
                          ┌──────────────▼───────────────────────────────────────────┐
                          │  packages/core — ALL business logic (pure TS, tested)     │
                          │  domain (state machines, ranking, preflight) · repo (DB)  │
                          │  adapters (github, vercel, http-probe) · crypto · ai      │
                          │  inngest client + event schemas                            │
                          └───────┬───────────────┬──────────────┬───────────────────┘
                                  │               │              │
                           Neon Postgres     GitHub API     Vercel API      AI providers
                           (neon-http)      (GitHub App)   (user token)     (BYOK/default)
```

**Golden rule:** `apps/web` route handlers, Inngest functions, and `apps/mcp` tools are **thin**. They parse input, call one `packages/core` service function, and shape output. Business logic lives only in `packages/core`.

---

## 2. Tech stack (pin these major versions)

| Layer | Choice | Version (verified 2026-10-17) | Why |
|---|---|---|---|
| Runtime | Node.js | 22 LTS | Global `fetch`, `WebSocket`; Vercel + Docker support |
| Package manager | pnpm workspaces + Turborepo | pnpm 10, turbo 2 | Fast, strict, monorepo caching |
| Language | TypeScript strict | 5.x | |
| Web framework | Next.js App Router | **16.4** (React **19.3**) | Vercel-native, RSC, metadata API. Note: Next 16 uses `proxy.ts` instead of `middleware.ts` |
| Styling | Tailwind CSS | **4.3** | CSS-first tokens (`@theme`) |
| UI kit | shadcn/ui (+ registries, doc 08) | latest CLI | Own the component code |
| Auth (web) | Better Auth + GitHub social login | **1.7** | Drizzle adapter, simple, self-hosted sessions |
| DB | Neon Postgres (Free) | — | Serverless, scale-to-zero, branching |
| ORM | Drizzle ORM + drizzle-kit | **0.45.x stable** (do **not** use the 1.0 rc) | Typed SQL, migrations |
| DB driver | `@neondatabase/serverless` via `drizzle-orm/neon-http` | 1.2 | HTTP queries, perfect for serverless; also fine in the MCP server |
| Workflows | Inngest (Cloud, Free) | SDK **v4** (`inngest@4`) | Durable steps, sleep, retries, concurrency on serverless |
| GitHub | GitHub App via `@octokit/app` | 16.x | Installation tokens, per-repo permissions, webhooks |
| Vercel | REST API via `fetch` wrapper | API v1/v7/v9/v10 | No SDK needed |
| AI | Vercel AI SDK | **`ai@7`** + `@ai-sdk/{anthropic,openai,google,xai}` | One API, BYOK per call, structured output |
| Validation | Zod | `zod@4` in core/web; **NitroStack's re-exported `z` (zod 3.25) for MCP tool schemas** | See §8 gotcha G3 |
| MCP server | NitroStack | `@nitrostack/core@1.1`, `@nitrostack/cli@1.1`, `@nitrostack/widgets@1.0` | Decorators, DI, guards, widgets, NitroStudio |
| Logging | pino (core + mcp), console JSON (web) | | Structured, redaction |
| Tests | Vitest (core, web), Playwright (web smoke), MCP smoke script | | |
| Lint/format | ESLint (next config) + Prettier | | |

Hosting (all free):

| What | Where | Notes |
|---|---|---|
| `apps/web` | **Vercel Hobby** | Fluid compute default; function max 300 s. Non-commercial use only on Hobby. |
| `apps/mcp` | **Northflank free** (always-on, Docker) | Alternatives: Koyeb free (scales to zero after 1 h idle), Google Cloud Run (free tier, cold start). **Avoid Render free** (sleeps after 15 min, ~1 min cold start). Fly.io/Railway have no free tier. |
| DB | **Neon Free** | 1 GB/project, 100 CU-h/month, scale-to-zero after 5 min (cold start: a few hundred ms) |
| Workflows | **Inngest Cloud Free** | 50k executions/month ("5 `step.run()` = 6 executions"); 5 concurrent steps |
| Demo app | Vercel Hobby (separate project) | |

---

## 3. Repo layout (create exactly this)

```
firebreak/
├── CONTEXT.md                      # builder AI memory (see 00)
├── README.md
├── docs/                           # these spec files (read-only for the builder)
├── package.json                    # root scripts (dev, build, typecheck, test, fixture:*)
├── pnpm-workspace.yaml             # packages: ["apps/*", "packages/*"]
├── turbo.json
├── tsconfig.base.json
├── .env.example                    # every var, documented (doc 13 §2)
├── .github/workflows/ci.yml
├── apps/
│   ├── web/                        # Next.js 16
│   │   ├── src/app/(marketing)/…   # home, legal — static
│   │   ├── src/app/(auth)/login/…
│   │   ├── src/app/app/…           # authenticated product UI (/app/*)
│   │   ├── src/app/api/v1/…        # REST route handlers
│   │   ├── src/app/api/auth/[...all]/route.ts   # Better Auth
│   │   ├── src/app/api/inngest/route.ts
│   │   ├── src/app/{sitemap,robots,manifest}.ts, opengraph-image.tsx, llms.txt/route.ts, llms-full.txt/route.ts
│   │   ├── src/inngest/functions/*.ts
│   │   ├── src/env.ts              # Zod env validation (lazy, doc 13 §2.4)
│   │   ├── src/lib/{auth.ts,auth-client.ts,session.ts,api.ts,http.ts,error-copy.ts}
│   │   ├── src/assets/DepartureMono-Regular.otf   # OG image font
│   │   ├── src/components/{ui,marketing,app,brand}/…
│   │   ├── src/proxy.ts            # Next 16 proxy (optimistic auth redirect for /app/*)
│   │   └── public/fonts/DepartureMono-Regular.woff2
│   └── mcp/                        # NitroStack project (scaffolded by nitrostack-cli, then edited)
│       ├── src/index.ts, src/app.module.ts
│       ├── src/auth/{mcp-key.guard.ts,identity.ts}
│       ├── src/modules/{incidents,actions,services}/…
│       ├── src/widgets/            # Next.js 14 widget app (own package.json, built by nitrostack-cli)
│       ├── Dockerfile
│       └── scripts/smoke.ts        # MCP client smoke test over HTTP
├── packages/
│   ├── core/                       # ALL business logic — built with tsup to dist/ (ESM + d.ts)
│   │   ├── src/db/{schema.ts,client.ts,migrations/}
│   │   ├── src/domain/{state.ts,ranking.ts,preflight.ts,fingerprint.ts,errors.ts}
│   │   ├── src/repo/*.ts           # workspace-scoped queries
│   │   ├── src/services/*.ts       # use-cases: ingestAlert, traceIncident, proposeRollback, approveAction, executeAction, recordProbe …; views.ts (read models)
│   │   ├── src/views/types.ts      # shared DTO types (doc 06 §5.7)
│   │   ├── scripts/{reencrypt.ts,cancel-action.ts}   # ops scripts (doc 13 §6)
│   │   ├── src/adapters/{github.ts,vercel.ts,probe.ts,ssrf.ts}
│   │   ├── src/crypto/{secrets.ts,hmac.ts,keys.ts}
│   │   ├── src/ai/{models.ts,analyze.ts,schema.ts,bundle.ts,sanitize.ts,prompts/}
│   │   ├── src/inngest/{client.ts,events.ts}
│   │   ├── src/util/{ids.ts,logger.ts,retry.ts,time.ts,env.ts,pmap.ts}
│   │   └── test/…                  # vitest (+ test/fixtures/demo.ts, test/ai/*)
│   └── fixtures/                   # alert fixture CLI (doc 11)
└── (separate repo) firebreak-demo/
```

---

## 4. Data flow — the core loop (sequence)

```
fixture ─POST signed alert─► web /api/v1/alerts/{svc}
  web: verify HMAC → insert alert → open incident (status=open) → inngest.send("incident/opened") → 202
Inngest ─► fn "incident-pipeline" (web):
  step "trace":     vercel.getCurrentProduction + previous good → github.compare + per-commit files → rank → save suspects
                    → incident triaged → emit "incident/traced"
  step "propose":   build rollback plan → preflight → action awaiting_approval → incident awaiting_approval
                    → emit "action/proposed"
Inngest ─► fn "incident-analysis" (on "incident/traced"): build bundle → LLM → sanitize → save analysis
Inngest ─► fn "action-expiry" (on "action/proposed"): sleep 15m → CAS awaiting_approval→expired
Browser (polls GET /api/v1/incidents/{id} every 2 s while active) ─► user clicks Approve
  web POST /api/v1/actions/{id}/approve: CAS awaiting_approval→approved → inngest.send("action/approved")
Inngest ─► fn "action-execute" (on "action/approved", concurrency 1 per actionId):
  step "preflight" (drift check) → step "execute" CAS approved→executing → vercel rollback API
  step "confirm"   poll project.lastAliasRequest until succeeded (≤ 45 s per attempt, retried) → incident verifying
  loop: step.sleep (5 s first, then 10 s) → step "probe-n" GET health_url → save probe → 3 consecutive ok → verified → incident resolved
        18 probes without success → verification_failed → incident mitigation_failed
```

MCP path: `propose_rollback` / `get_incident` / … call the same `packages/core` services; approval via web (or MCP only with `actions:approve` scope); `action/approved` event triggers the same execute function.

---

## 5. Why this architecture (decisions + rejected alternatives)

| Decision | Chosen | Rejected | Reason |
|---|---|---|---|
| Backend shape | Next.js route handlers + Inngest + separate MCP server, shared `core` | Separate Express/Hono API on a free host | Free Node hosts sleep or are slow; Vercel functions are fast and free. Only the MCP server *must* be long-running (NitroStack is Express with in-memory sessions; no serverless handler). |
| Long-running steps (wait 15 min, probe every 10 s) | Inngest | Vercel Cron (Hobby = once/day), setTimeout in a function, BullMQ+Redis | Durable, retries, serverless-friendly, free. |
| Approval wait | Separate `action/approved` event function + separate expiry function | `step.waitForEvent` in one function | `waitForEvent` misses an approval that arrives before the wait starts; two event-triggered functions + DB compare-and-set are race-free. |
| DB driver | neon-http everywhere, **no interactive transactions** | WebSocket Pool / TCP pg | One driver, no connection management. All writes are single statements or compare-and-set (doc 06). |
| GitHub auth | GitHub App | OAuth token with `repo` scope | Least privilege (Contents: read), per-org install, short-lived tokens. |
| Vercel auth | User-provided access token (team- or project-scoped) | Vercel Integration (OAuth) | Minutes to build; integration listed in roadmap. |
| Session auth | Better Auth (GitHub login) | Auth.js, Clerk, Supabase Auth | Self-hosted on Neon, simple, current. |
| MCP auth | Firebreak-issued API keys via custom NitroStack guard | NitroStack `ApiKeyModule`, OAuth 2.1 | `ApiKeyModule.validate()` cannot do DB lookups (verified bug, §8 G6). OAuth 2.1 → roadmap. |
| Live updates | Polling (TanStack Query, 2 s while active) | SSE/WebSockets | Works on serverless, no extra infra, good enough for a 2-minute loop. |

---

## 6. Environments

| Env | Web | MCP | DB | Inngest |
|---|---|---|---|---|
| local | `pnpm dev` → http://localhost:3000 | `pnpm --filter mcp dev` (stdio for NitroStudio) or `MCP_TRANSPORT_TYPE=http` on :3005 | Neon branch `dev` | `npx inngest-cli@latest dev` (Dev Server, http://localhost:8288) |
| prod | Vercel production domain | Northflank service URL `/mcp` | Neon `main` | Inngest Cloud (Vercel integration sets `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`) |

Use **Neon branches** for local dev vs prod (free). Never point local dev at the prod branch.

---

## 7. Cross-cutting concerns (where each lives)

| Concern | Location |
|---|---|
| Tenancy (workspace scoping) | `core/repo/*` (first arg `workspaceId`) |
| Secrets encryption | `core/crypto/secrets.ts` |
| HMAC (alerts, GitHub webhooks, OAuth state) | `core/crypto/hmac.ts` |
| Retries/timeouts for outbound HTTP | `core/util/retry.ts` (`withRetry(fn, {retries, baseMs, maxMs, retryOn})`) + every adapter sets `AbortSignal.timeout` |
| Idempotency | DB unique constraints + compare-and-set + Inngest function `idempotency` / `concurrency` keys |
| Errors | `core/domain/errors.ts` (`AppError(code, httpStatus, message, details)`); web maps to envelope; MCP maps to tool error text |
| Logging + redaction | `core/util/logger.ts` (pino, `redact` paths) |
| Rate limits | `usage_counters` table (doc 06 §2.13) |
| SSRF guard | `core/adapters/ssrf.ts` |

---

## 8. Gotchas (verified — read before coding)

- **G1 Vercel rollback on Hobby** only targets the **immediately previous** production deployment ("Hobby users can roll back to the immediately previous deployment"). The planner targets that deployment; a 402/4xx from Vercel becomes `error_code='vercel_plan_limit'` with a clear message.
- **G2 After a rollback Vercel turns off auto-assignment of production domains**: new pushes do not go live until a deployment is promoted (`POST /v10/projects/{id}/promote/{deploymentId}`) or "Undo Rollback" is clicked. Show this in the UI after a successful rollback ("Auto-deploys paused by Vercel until you promote a new deployment") and handle it in `fixture:reset`.
- **G3 Two Zods.** NitroStack re-exports zod 3.25 (`import { z } from '@nitrostack/core'`) and converts tool `inputSchema` with `zod-to-json-schema`. **MCP tool schemas must use NitroStack's `z`.** `packages/core` uses `zod@4`. Never pass a core (zod 4) schema as a NitroStack `inputSchema`.
- **G4 NitroStack does not validate tool input at runtime.** Every tool handler starts with `const input = Schema.parse(rawInput)`.
- **G5 NitroStack `ctx.auth` is not trustworthy by default** (bearer tokens are decoded without signature verification). Identity is read only from what `McpKeyGuard` stored (doc 05 §4).
- **G6 `ApiKeyModule.validate()` with `customValidation` always denies when no static keys are configured.** Don't use it. Use the custom guard.
- **G7 NitroStack is a long-running Express server** (in-memory sessions). Host it on an always-on container, run **1 instance**, set `HOST=0.0.0.0`, `MCP_TRANSPORT_TYPE=http`, health is `GET /mcp/health`.
- **G8 NitroStack widgets are a separate Next.js 14 / React 18 app** inside `apps/mcp/src/widgets` built to `src/widgets/out/*.html`; the server reads them relative to `process.cwd()`. The Docker image must contain `src/widgets/out` and run from the project root. Prefer **inline styles** in widgets (Tailwind may not work inside client iframes).
- **G9 NitroStack project is ESM with `moduleResolution: node`** → `packages/core/package.json` must expose top-level `"main"`, `"types"` (pointing to `dist/`) in addition to `"exports"`, and `apps/mcp` imports use `.js` suffixes for local files.
- **G10 Neon HTTP driver has no interactive transactions.** Design (doc 06) uses single statements + compare-and-set. Do not call `db.transaction()`.
- **G11 Inngest v4 signature:** `inngest.createFunction({ id, triggers: { event: "x/y" }, … }, async ({ event, step }) => {})` — triggers go **inside** the options object.
- **G12 A callback's `installation_id` can be spoofed** (GitHub's docs say so). A signed `state` only proves who started the flow, and the App JWT only proves the installation exists. Enable "Request user authorization (OAuth) during installation", exchange the `code`, and require the id to be in that user's `GET /user/installations` (doc 03 §5).
- **G13 Production stack frames are bundled/minified on Vercel.** Ranking uses path-suffix + symbol + service hints (doc 11 §2.4).
- **G14 AI SDK v7 deprecates `generateObject`.** Use `generateText({ output: Output.object({ schema }) })`.
- **G15 NitroStack CLI sends telemetry** (PostHog) and no opt-out was found in 1.1.2. Mention it in README; it does not affect the product.
- **G16 `@Cache` in NitroStack keys on input only (no identity).** Never use `@Cache` on workspace data without a `key` that includes the workspace id. MVP: don't use `@Cache` at all.

---

## 9. Verified facts (external APIs — source of truth for adapters)

All verified 2026-10-17 from official docs. Re-verify anything marked ⚠ the first time you call it, by logging the raw response in dev, and record the result in `CONTEXT.md` §4.

### Vercel REST (`https://api.vercel.com`, `Authorization: Bearer <token>`, add `?teamId=` only for full-account tokens accessing a team)
| Purpose | Request | Notes |
|---|---|---|
| Validate token | `GET /v2/user` | 200 → `user.username` |
| List projects | `GET /v9/projects?limit=100` (+`teamId`) | `link.repo`, `link.org`, `link.productionBranch` ⚠ |
| Get project | `GET /v9/projects/{idOrName}` | `targets.production` = current production deployment ⚠ (shape: has `id`); `lastAliasRequest: { type: "promote"\|"rollback", jobStatus: "pending"\|"in-progress"\|"succeeded"\|"failed"\|"skipped", fromDeploymentId, toDeploymentId, requestedAt }`; `lastRollbackTarget` |
| List deployments | `GET /v7/deployments?projectId=…&target=production&state=READY&limit=20` | also `rollbackCandidate=true`, `sha=…`, `until=` (pagination via `pagination.next`). Item: `uid`, `url`, `state`, `readyState`, `readySubstate` (`STAGED\|ROLLING\|PROMOTED`), `target`, `isRollbackCandidate`, `created` (ms), `meta.githubCommitSha` ⚠, `meta.githubCommitRef`, `meta.githubCommitMessage` |
| Rollback | `POST /v1/projects/{projectId}/rollback/{deploymentId}?description=…` | no body; 201 on success; 402/409/422 possible; one rollback at a time per project |
| Promote (reset/undo) | `POST /v10/projects/{projectId}/promote/{deploymentId}` | 201/202; does not rebuild; a deployment that was already promoted cannot be promoted again (roll back to it instead) |
| Rate limits | headers `X-RateLimit-Limit/Remaining/Reset`; 429 with `Retry-After` | generous (500–1000/min) |
| Tokens | Full account / Team / Project scopes (project tokens start `vcp_`) | Team- and project-scoped tokens need no `teamId` |
| Protection | Production **domains** are public under Standard Protection; generated deployment URLs are protected | Probes hit `health_url` on the production domain only |

**Current production deployment algorithm** (`vercel.getCurrentProduction(projectId)`):
1. `GET /v9/projects/{id}` → if `targets.production.id` exists → fetch that deployment (`GET /v13/deployments/{id}` ⚠) → return.
2. Else if `lastAliasRequest?.jobStatus === "succeeded"` → use `lastAliasRequest.toDeploymentId`.
3. Else → newest of `GET /v7/deployments?projectId&target=production&state=READY&limit=1`.
Log which branch was used (debug). Never assume "newest READY" when (1) or (2) is available — after a rollback it is wrong.

**Last good deployment** (`vercel.getRollbackTarget(projectId, bad)`):
`GET /v7/deployments?projectId&target=production&state=READY&rollbackCandidate=true&limit=20` → first item with `created < bad.created` and `sha !== bad.sha` and `uid !== bad.uid` and not in this service's known-bad list (bad deployments of earlier incidents). None → no target (incident stays `triaged`, UI says "No earlier production deployment to roll back to").

### GitHub (App)
- `@octokit/app` v16: `new App({ appId, privateKey, webhooks: { secret } })`, `await app.getInstallationOctokit(installationId)`; installation tokens auto-refresh (1 h).
- Private key: GitHub gives PKCS#1. Store in env as one line with `\n` escapes; `privateKey.replace(/\\n/g, "\n")`. If a library needs PKCS#8: `openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in key.pem`.
- Permissions: **Repository → Contents: Read**, **Metadata: Read** (mandatory). Subscribe to events: none required for MVP; GitHub always sends `installation` and `installation_repositories` to the App webhook.
- Compare: `GET /repos/{owner}/{repo}/compare/{base}...{head}` → up to 250 commits (unpaginated), files only on first page, ≤ 300 files. Per commit: `GET /repos/{owner}/{repo}/commits/{sha}` → `files[].{filename,status,additions,deletions,patch?}` (`patch` may be missing for binary/huge files).
- With "Request user authorization (OAuth) during installation" enabled, GitHub redirects to the App's **Callback URL** with `?code=…&installation_id=…&setup_action=…` (⚠ `setup_action`); the Setup URL is disabled. Exchange `code` at `POST https://github.com/login/oauth/access_token` (`client_id`, `client_secret` of the App, `code`; `Accept: application/json`) → `GET /user/installations` (user-to-server token) must list the id. Details via `GET /app/installations/{id}` with the App JWT (`app.octokit.request(...)`).
- Webhook signature header `x-hub-signature-256: sha256=<hex HMAC of raw body>`; delivery id `x-github-delivery`.

### Inngest v4
```ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "firebreak" });

export const fn = inngest.createFunction(
  { id: "action-execute", triggers: { event: "action/approved" }, concurrency: { key: "event.data.actionId", limit: 1 }, idempotency: "event.data.actionId", retries: 3 },
  async ({ event, step }) => {
    const r = await step.run("execute", async () => ({ ok: true }));
    await step.sleep("wait-10s", "10s");
    return r;
  },
);
// apps/web/src/app/api/inngest/route.ts
import { serve } from "inngest/next";
export const maxDuration = 60;
export const { GET, POST, PUT } = serve({ client: inngest, functions: [/* … */] });
```
From `apps/mcp`: `await inngest.send({ name, data })` with `INNGEST_EVENT_KEY` set. Local: Inngest Dev Server `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`.
Free plan: 50k executions/month, 5 concurrent steps. A full loop costs roughly 50 executions.

### Better Auth 1.7
```ts
// apps/web/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  socialProviders: { github: { clientId: process.env.GITHUB_OAUTH_CLIENT_ID!, clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET! } },
  plugins: [nextCookies()],
});
// app/api/auth/[...all]/route.ts → export const { GET, POST } = toNextJsHandler(auth);   (import from "better-auth/next-js")
// client: createAuthClient() from "better-auth/react"
// server: const session = await auth.api.getSession({ headers: await headers() });
```
Env: `BETTER_AUTH_SECRET` (≥ 32 chars), `BETTER_AUTH_URL`. Schema: `npx auth@latest generate` → merge into `packages/core/src/db/schema.ts`. Use `databaseHooks.user.create.after` to create the personal workspace (fallback: lazily create on first `requireSession`).

### NitroStack 1.1 — see doc 05 (all details there).

### AI SDK 7 + model ids — see doc 07 §2.
