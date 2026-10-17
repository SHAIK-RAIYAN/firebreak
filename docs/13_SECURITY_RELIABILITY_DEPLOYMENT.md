# 13 — Security, Reliability, Environment Variables, Deployment, Runbooks

---

## 1. Threat model (MVP) — every row must be implemented

| Threat | Control | Where |
|---|---|---|
| Forged / replayed alerts | HMAC-SHA256 over `timestamp.rawBody`, ±300 s window, `timingSafeEqual`, per-service secret, optional `id` idempotency, 60/min rate limit | `core/services/alerts.ts`, `crypto/hmac.ts` |
| Cross-tenant reads/writes | Every repo function requires `workspaceId`; other-workspace ids return 404; integration test proves isolation | `core/repo/*` |
| CSRF on session-authenticated mutations | Better Auth cookies (`SameSite=Lax`, `HttpOnly`, `Secure`) **plus** the `route()` wrapper rejects non-GET requests whose `Origin` header is not `NEXT_PUBLIC_SITE_URL` (403) | `apps/web/src/lib/api.ts` |
| Accidental / malicious production change | Human approval (web, or MCP key with `actions:approve`), 15-min expiry, drift re-check before execution, single live action per incident (partial unique index), CAS transitions, never-twice Vercel call | doc 03 §9 |
| Stolen MCP key | Stored as SHA-256 hash; shown once; scopes (approve off by default); revocation (≤ 60 s cache); `last_used_at`; prefix shown for identification | `core/services/mcpKeys.ts`, `apps/mcp/src/auth` |
| Forged identity inside NitroStack | Identity only from guard-populated WeakMap (`ctx.auth` ignored) | doc 05 §4 |
| Prompt injection via commit messages/diffs/errors | Untrusted tags + XML escaping, explicit system-prompt rules, AI output cannot trigger actions, deterministic sanitizer, plain-text rendering | doc 07 |
| Secret exfiltration through AI | Secret scrubber on diffs before sending; only top-5 excerpts sent | doc 07 §5 |
| SSRF via health URL | https only (prod), DNS resolve + private-range block, no redirects, 5 s timeout, 64 KB cap | `core/adapters/ssrf.ts` |
| Secrets at rest | AES-256-GCM with AAD binding to workspace/purpose; key versioning | doc 07 §3 |
| Secrets in logs | pino redaction; never log request bodies of `/alerts`, `/ai/keys`, `/integrations/vercel`, `/mcp-keys` | `core/util/logger.ts` |
| GitHub installation hijack (swapping in someone else's `installation_id`) | "Request user authorization during installation" → `code` exchange → id must be in the user's `GET /user/installations`; signed `state` when present; one workspace per installation; user token never stored | doc 03 §5 |
| GitHub webhook spoofing | `x-hub-signature-256` verification + delivery dedupe | doc 03 §5 |
| Clickjacking | `frame-ancestors 'none'` | `next.config.ts` |
| Abuse of default AI key | 20 analyses / workspace / day; max 3 analysis attempts per incident | doc 07 §2.2 |
| Brute-force key validation | 10 AI-key saves / user / hour; 60 MCP calls / key / min | `usage_counters`, `@RateLimit` |
| Supply chain | Committed lockfile, `pnpm install --frozen-lockfile` in CI/Docker, Dependabot on the repo | repo config |

Known accepted risks (document in README "Security"): NitroStack CLI telemetry in dev; in-memory MCP rate limits (single instance); no full script CSP yet.

---

## 2. Environment variables (single source of truth → also `.env.example` at the repo root)

### 2.1 `apps/web` (Vercel)
| Var | Example / how to get | Required |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://firebreak.vercel.app` (local `http://localhost:3000`) | ✅ |
| `NEXT_PUBLIC_MCP_URL` | `https://<mcp-host>/mcp` | ✅ |
| `DATABASE_URL` | Neon **pooled** connection string | ✅ |
| `DATABASE_URL_UNPOOLED` | Neon direct string (migrations only) | migrations |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | ✅ |
| `BETTER_AUTH_URL` | same as site URL | ✅ |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | doc 12 A1 | ✅ |
| `GITHUB_APP_ID` / `GITHUB_APP_SLUG` | doc 12 A2 | ✅ |
| `GITHUB_APP_CLIENT_ID` / `GITHUB_APP_CLIENT_SECRET` | the GitHub **App's** client credentials (install-time ownership check), doc 12 A2 | ✅ |
| `GITHUB_APP_PRIVATE_KEY` | PEM, one line with `\n` | ✅ |
| `GITHUB_WEBHOOK_SECRET` | random 32 bytes | ✅ |
| `STATE_SECRET` | `openssl rand -base64 32` (OAuth/install state signing) | ✅ |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` — **same value on web and MCP** | ✅ |
| `ENCRYPTION_KEY_PREVIOUS` | only during rotation | ❌ |
| `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY` | set by the Inngest Vercel integration (prod); not needed locally with the Dev Server | prod |
| `INNGEST_DEV` | `1` **locally only** (SDK talks to the Inngest Dev Server). Never set in prod. | local |
| `DEFAULT_AI_PROVIDER` / `DEFAULT_AI_MODEL` / `DEFAULT_AI_API_KEY` | e.g. `anthropic` / `claude-haiku-5-5` / key — the cheap model keeps the free default affordable | ❌ (no default → BYOK only) |
| `AI_DEFAULT_DAILY_LIMIT` | `20` | ❌ |
| `ACTION_APPROVAL_TTL_MIN`, `VERIFY_REQUIRED_STREAK`, `VERIFY_MAX_PROBES`, `VERIFY_INTERVAL_S` | `15`, `3`, `18`, `10` | ❌ |
| `LOG_LEVEL` | `info` | ❌ |

### 2.2 `apps/mcp` (Northflank) — doc 05 §8 with prod values: `NODE_ENV=production`, `MCP_TRANSPORT_TYPE=http`, `HOST=0.0.0.0`, `PORT=3000`, `NITROSTACK_APP_MODE=universal`, `DATABASE_URL`, `ENCRYPTION_KEY`, `INNGEST_EVENT_KEY`, `FIREBREAK_APP_URL`, `NITRO_LOG_LEVEL=info`. **No** `FIREBREAK_MCP_KEY` in prod.

### 2.3 `packages/fixtures` — doc 11 §3.

### 2.3a Test / tooling only
| Var | Use |
|---|---|
| `DATABASE_URL_TEST` | Neon `test` branch for DB-backed tests (tests skip when unset) |
| `MCP_URL` / `FIREBREAK_MCP_KEY` | `apps/mcp` smoke script target + key |
| `TEST_AI_PROVIDER` / `TEST_AI_API_KEY` | `pnpm test:ai` prompt regression run (doc 07 §7.1) |

### 2.4 Validation
`apps/web/src/env.ts` and `apps/mcp/src/env.ts`: Zod schemas parsed on first server use (not at import time during `next build`). Missing/invalid → throw with the var **name** only. `ENCRYPTION_KEY` must decode to exactly 32 bytes.

---

## 3. Deployment (first time, in order)

1. **Neon:** create project `firebreak` (region near Vercel `iad1`, e.g. AWS us-east-1). Branches: `main` (prod), `dev` (local). Copy pooled + direct URLs for each.
2. **Migrate prod:** `DATABASE_URL_UNPOOLED=<prod direct> pnpm --filter @firebreak/core db:migrate`.
3. **GitHub:** create prod OAuth App + prod GitHub App (doc 12 A1–A2) with your final domain (use the Vercel `*.vercel.app` domain if no custom domain).
4. **Vercel — web:** New Project → import the repo → **Root Directory `apps/web`** → Framework Next.js → **Build Command** `cd ../.. && pnpm turbo run build --filter=@firebreak/web` → Install Command default (pnpm detected) → add env vars (§2.1) → Deploy.
5. **Inngest:** install the Inngest integration on the project → redeploy → Inngest dashboard shows app `firebreak` with **5** functions synced (`incident-pipeline`, `incident-retrace`, `incident-analysis`, `action-expiry`, `action-execute`).
6. **MCP — Northflank:** new combined service from the repo → Dockerfile `apps/mcp/Dockerfile`, context `/` → port 3000 public HTTP → env (§2.2) → health check `/mcp/health` → 1 instance → deploy. Copy the public URL → set `NEXT_PUBLIC_MCP_URL` in Vercel → redeploy web.
7. **Demo:** create `firebreak-demo` repo + Vercel project (doc 11) → in Firebreak: install App on it, connect Vercel, create the Service → fill `packages/fixtures/.env` with prod values.
8. **Smoke:** `curl https://<site>/api/health`, `curl https://<mcp>/mcp/health`, `pnpm --filter @firebreak/mcp smoke` (prod URL + key), then the full demo (doc 14 §3).

### 3.1 Subsequent deploys
- Web: push to `main` → Vercel builds. MCP: Northflank builds on push (enable CI on the branch).
- **Migrations first, then code.** Any PR that adds a migration: before merging, run `DATABASE_URL_UNPOOLED=<prod direct> pnpm --filter @firebreak/core db:migrate` (and the same against the `dev` branch). Migrations must be backward-compatible with the running code (additive only), so applying them before the deploy is safe.
- Keep `ENCRYPTION_KEY` identical on both hosts; changing it without rotation makes every stored secret unreadable.

### 3.2 CI — `.github/workflows/ci.yml` (on PR + push)
```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run typecheck lint test
      - run: pnpm turbo run build --filter=@firebreak/web --filter=@firebreak/mcp
        env:
          DATABASE_URL: postgresql://build:build@localhost:5432/build
          BETTER_AUTH_SECRET: build-only-secret-build-only-secret-00
          BETTER_AUTH_URL: http://localhost:3000
          ENCRYPTION_KEY: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
          NEXT_PUBLIC_SITE_URL: http://localhost:3000
          NEXT_PUBLIC_MCP_URL: http://localhost:3005/mcp
```
(Builds must not need real secrets: env validation and the DB client are lazy; the dummy values above only satisfy module-scope constructors and are never used to connect.)

---

## 4. Reliability — failure modes and behaviour

| Dependency down | Behaviour | User sees |
|---|---|---|
| Neon (DB) | API 500 with request id; alerts return 500 → sender should retry (document: retry with backoff, same `id`) | Error toast "Service temporarily unavailable" |
| Inngest | Alert still accepted (incident created); `inngest.send` failure logged; approval returns 502 `UPSTREAM_ERROR` (reason `DISPATCH_FAILED`) and rolls back its state | "Trace pending" + Retry trace (enabled after 60 s); "Couldn't start the rollback. Nothing changed." |
| GitHub API | Trace step retries (3 with backoff) → trace failed `upstream_unavailable` | "GitHub didn't respond — Retry trace" |
| Vercel API (read) | Same as GitHub | Same |
| Vercel API (rollback) | 409 retried by Inngest; other errors → action failed with reason | Clear reason + "Propose again" |
| AI provider | Analysis failed/skipped; loop unaffected | Quiet card |
| MCP host | Web app unaffected | MCP clients show connection error |
| Health URL flaky | Needs 3 consecutive OKs; up to 18 probes | Probe strip shows the flapping honestly |

Timeouts (all outbound): Vercel read 8 s / write 15 s, GitHub 10 s, probe 8 s, AI 25 s, Inngest send 5 s.

---

## 5. Observability (MVP)

- Structured JSON logs with `requestId`, `workspaceId`, `incidentId`, `actionId`, `step` (pino in core/MCP; route wrapper adds them in web).
- Where: Vercel → Logs; Northflank → service logs; Inngest dashboard → every function run with step outputs (no secrets in outputs!).
- Health: `GET /api/health` (web, DB ping), `GET /mcp/health` (MCP).
- Weekly: check Inngest execution usage vs 50k free; Neon CU-hours vs 100.

---

## 6. Runbooks

Ops scripts live in `packages/core/scripts/` (run with `tsx`, read `packages/core/.env`), exposed as root scripts: `ops:reencrypt`, `ops:cancel-action <actionId>`. They are built in M10.

| Situation | Steps |
|---|---|
| **Rotate `ENCRYPTION_KEY`** | 1) Set `ENCRYPTION_KEY_PREVIOUS` = old, `ENCRYPTION_KEY` = new on web + MCP, bump version constant to 2. 2) Deploy both. 3) Run `pnpm ops:reencrypt` (script in `packages/core/scripts`: decrypt each sealed column with v1, re-seal with v2). 4) Remove `ENCRYPTION_KEY_PREVIOUS`. |
| **GitHub App private key leaked** | GitHub App settings → generate new key → update `GITHUB_APP_PRIVATE_KEY` → redeploy → delete the old key on GitHub. |
| **MCP key leaked** | Revoke in `/app/settings/mcp` (effective ≤ 60 s). If approve scope was granted: check timeline for `decided_via = mcp` events. |
| **Action stuck in `executing`/`verifying`** | Normally impossible (`onFailure` marks it failed). If it happens: Inngest dashboard → the `action-execute` run → **Rerun** (safe: `executeAction` never calls Vercel twice). **Do not re-send `action/approved`** — the function's 24 h idempotency key silently drops it. Last resort: `pnpm ops:cancel-action <actionId>` (CAS to `failed`, incident → `mitigation_failed`, timeline note). |
| **Vercel auto-deploys paused after a rollback** | Vercel dashboard → project → promote the fixed deployment / Undo Rollback. |
| **Free-tier exhaustion** | Inngest: functions pause until next month → incidents still created, trace pending. Neon: DB suspended → whole app down → upgrade or wait; keep probes/timeline small. |
