# CONTEXT.md — Firebreak build memory

> **The builder AI owns this file.** Read it at the start of EVERY session and before EVERY task.
> Update it at the end of EVERY task (not "later"). Keep it under ~400 lines: summarise, don't paste code.
> If this file and the docs disagree, the docs win unless a "Decisions" entry below says otherwise with a reason.

---

## 0. Status line (update every task)

- **Current milestone:** M4 — Alert intake + Inngest incident workflow (see `docs/15_BUILD_PLAN.md`)
- **Last completed task:** M3 Integrations (GitHub App, Vercel token, SSRF guard, Probe, Services wizard)
- **Next task:** M4 Alert intake + Inngest incident workflow (trace → analyse → propose)
- **Blockers:** —
- **Last green check:** 2026-10-17 (`npm run build`, `npm run typecheck`, `npm run test` 78 passed, `npm run lint`)

## 1. Milestone checklist (copy of docs/15 milestones — tick only when its "Verify" step passed)

- [x] M0 Scaffold (monorepo, lint, typecheck, CI)
- [x] M1 Database + auth (Neon, Drizzle, Better Auth, workspace bootstrap)
- [x] M2 Core domain (crypto, HMAC, state machines, ranking, preflight) + unit tests
- [x] M3 Integrations (GitHub App, Vercel token, Services wizard)
- [ ] M4 Alert intake + Inngest incident workflow (trace → analyse → propose)
- [ ] M5 Approve → execute → verify (core loop complete, demo passes in local)
- [ ] M6 App UI polish (incident page live, settings/AI keys, MCP keys)
- [ ] M7 NitroStack MCP server (tools, widgets, auth) + NitroStudio verified
- [ ] M8 Marketing site (loader, ASCII fire, scroll story, SEO files)
- [ ] M9 Deploy (Vercel + MCP host + Neon + Inngest Cloud) + production demo passes
- [ ] M10 Hardening pass (Lighthouse, a11y, security checklist, README)

## 2. Decisions (ADR log — append only)

| # | Date | Decision | Why | Doc section affected |
|---|---|---|---|---|
| D1 | 2026-10-17 | Use npm workspaces instead of pnpm | User request | 02 §2, 15 M0 |
| D2 | 2026-10-17 | Add `packageManager: npm@11.6.2` to root package.json | Turborepo requires packageManager field for npm workspaces | 02 §2 |
| D3 | 2026-10-17 | Use `drizzle-orm/neon-http/migrator` script | Neon HTTP migrations work reliably in Node without WebSockets | 02 §5, 03 §2 |
| D4 | 2026-10-17 | Remove experimental `cacheComponents: true` in Next 16 | Avoided breakage of standard dynamic route exports in App Router | 02 §2 |

## 3. Deviations from the docs (anything built differently than specified)

| What | Spec said | Built instead | Reason |
|---|---|---|---|
| Package Manager | pnpm | npm | User specified npm/bun preference, selected npm |

## 4. Verified external facts (things you checked in real docs / node_modules types)

Record every API shape you verified so you never guess twice. Format: `fact — source (URL or node_modules path) — date`.

- Turborepo requires `packageManager` in root `package.json` when using npm workspaces — CLI output — 2026-10-17
- Next 16.4.2 Turbopack builds and resolves `@firebreak/core` via `main`/`exports` map in root dependencies — 2026-10-17
- `nanoid` customAlphabet works in `@firebreak/core` ESM bundle targeting node22 via tsup — 2026-10-17
- `drizzle-orm/neon-http/migrator` applies Drizzle migrations directly via Neon HTTP driver without WebSocket overhead — 2026-10-17
- All 20 tables successfully created in Neon Postgres public schema — 2026-10-17
- Next 16 requires `proxy.ts` and bans simultaneous `middleware.ts` — 2026-10-17
- Better Auth 1.7 `toNextJsHandler` works at `/api/auth/[...all]/route.ts` with Next.js 16 App Router — 2026-10-17
- `Vercel /v9/projects/{id}` returns `targets: {}` when no production deployment exists yet — 2026-10-17
- `Vercel /v2/user` returns `username: shaikraiyan` with bearer token — 2026-10-17
- `ipaddr.js` + Node DNS lookup reliably validates IPv4, IPv6, loopback, private ranges, and cloud metadata (169.254.169.254) — 2026-10-17
- Next.js 16 App Router requires wrapping client components reading `useSearchParams()` in `<Suspense>` to allow static prerendering at build time — 2026-10-17
- Vercel token encrypted with AES-256-GCM and AAD `${ws}:vercel` stored in DB with `token_last4` — 2026-10-17

## 5. Environment variables status

| Var | Where (web / mcp / fixtures) | Set locally? | Set in prod? |
|---|---|---|---|
| DATABASE_URL | web, mcp, core | Yes (.env, .env.local, core/.env) | No |
| DATABASE_URL_UNPOOLED | web, mcp, core | Yes (.env, .env.local, core/.env) | No |
| BETTER_AUTH_SECRET | web | Yes (32-byte b64) | No |
| BETTER_AUTH_URL | web | Yes (http://localhost:3000) | No |
| GITHUB_OAUTH_CLIENT_ID | web | Yes | No |
| GITHUB_OAUTH_CLIENT_SECRET | web | Yes | No |
| GITHUB_APP_ID | web | Yes | No |
| GITHUB_APP_SLUG | web | Yes | No |
| GITHUB_APP_CLIENT_ID | web | Yes | No |
| GITHUB_APP_CLIENT_SECRET | web | Yes | No |
| GITHUB_APP_PRIVATE_KEY | web | Yes | No |
| GITHUB_WEBHOOK_SECRET | web | Yes (32-byte hex) | No |
| ENCRYPTION_KEY | web, mcp | Yes (32-byte b64) | No |
| STATE_SECRET | web | Yes (32-byte b64) | No |
| VERCEL_TOKEN | fixtures | Yes | No |
| VERCEL_PROJECT_ID | fixtures | Yes | No |

## 6. Commands that work

```bash
npm run dev            # parallel core watch and next dev (http://localhost:3000)
npm run build          # turbo build core + web
npm run typecheck      # turbo typecheck across packages
npm run test           # vitest run in core
npm run lint           # eslint in web
npm -w @firebreak/core run db:generate # generate migrations
npx tsx packages/core/src/db/migrate.ts # apply migrations to Neon
```

## 7. Known issues / TODO (small, local)

- None for M1.

## 8. File map (only important files, one line each)

- `package.json`: Root monorepo configuration with npm workspaces and turbo scripts
- `turbo.json`: Turborepo pipeline configuration with dependency outputs
- `tsconfig.base.json`: Base TypeScript compiler options
- `apps/web/src/app/globals.css`: Firebreak design tokens (night/day shift palettes)
- `apps/web/src/app/page.tsx`: Home page
- `apps/web/src/app/(auth)/login/page.tsx`: Minimal login page with GitHub OAuth button
- `apps/web/src/app/app/page.tsx`: Authenticated operator console showing user + workspace
- `apps/web/src/app/api/auth/[...all]/route.ts`: Better Auth route handler
- `apps/web/src/lib/auth.ts`: Better Auth server configuration with Drizzle adapter and bootstrap hook
- `apps/web/src/lib/auth-client.ts`: Better Auth React client
- `apps/web/src/lib/session.ts`: `requireSession` helper with automatic workspace bootstrap
- `apps/web/src/proxy.ts`: Next 16 optimistic auth check on `/app/*`
- `packages/core/src/db/schema.ts`: Complete Drizzle schema for all 20 tables + domain types
- `packages/core/src/db/client.ts`: Lazy Neon HTTP Drizzle client
- `packages/core/src/db/migrate.ts`: Migration runner using neon-http migrator
- `packages/core/src/repo/workspaces.ts`: Workspaces repository with idempotent bootstrap
- `packages/core/src/util/ids.ts`: Prefixed ID generator (`newId`)
- `packages/core/src/util/env.ts`: Safe environment variable reader
- `packages/core/src/util/time.ts`: Injectable clock (`now()`, `setMockClock`)
- `packages/core/src/util/pmap.ts`: Concurrency-limiting async mapper (`pMap`)
- `packages/core/src/util/retry.ts`: Exponential backoff with jitter and Retry-After
- `packages/core/src/util/logger.ts`: Pino logger writing to stderr with secret redaction
- `packages/core/src/crypto/secrets.ts`: AES-256-GCM encryption/decryption with AAD and key rotation
- `packages/core/src/crypto/hmac.ts`: HMAC-SHA256 signing and verification for alerts and webhooks
- `packages/core/src/crypto/keys.ts`: API key generation (`fbk_`) and SHA-256 hashing
- `packages/core/src/domain/errors.ts`: `AppError`, `isAppError`, `reasonOf`, full domain error codes
- `packages/core/src/domain/state.ts`: Pure state machines for IncidentStatus and ActionStatus
- `packages/core/src/domain/preflight.ts`: Action preflight validation (target ready, drift, unexpired, non-blocking alert probe)
- `packages/core/src/domain/ranking.ts`: Deterministic suspect ranking engine (path normalization, hunk parser, recency tiebreak)
- `packages/core/src/adapters/ssrf.ts`: SSRF protection with ipaddr.js, DNS resolution, private/loopback/cloud metadata blocks
- `packages/core/src/adapters/probe.ts`: Non-throwing HTTP health probe with latency measurement and observedSha extraction
- `packages/core/src/adapters/vercel.ts`: Vercel REST API client (user, projects, deployments, current production, rollback, alias)
- `packages/core/src/adapters/github.ts`: GitHub App Octokit client (verifyInstallation, repos, compare commits, commit files)
- `packages/core/src/services/context.ts`: ServiceContext types and factory functions (systemCtx, userCtx, mcpCtx)
- `packages/core/src/services/integrations.ts`: Integrations service (GitHub App install/callback/webhooks, Vercel token connect/disconnect)
- `packages/core/src/services/services.ts`: Services service (create, list, get, update, archive, rotate alert secret, probe health URL)
- `packages/core/src/services/mcpKeys.ts`: MCP API keys service (create, revoke, list, validate)
- `apps/web/src/app/api/v1/`: Next.js REST API routes for integrations, services, and health probes
- `apps/web/src/app/app/integrations/page.tsx`: Integrations dashboard (GitHub App installation status + Vercel token management)
- `apps/web/src/app/app/services/new/page.tsx`: 5-step Service creation wizard with live health probe test and one-time secret reveal
- `packages/fixtures/package.json`: Alert & break fixture scripts runner
