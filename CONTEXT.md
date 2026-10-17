# CONTEXT.md — Firebreak build memory

> **The builder AI owns this file.** Read it at the start of EVERY session and before EVERY task.
> Update it at the end of EVERY task (not "later"). Keep it under ~400 lines: summarise, don't paste code.
> If this file and the docs disagree, the docs win unless a "Decisions" entry below says otherwise with a reason.

---

## 0. Status line (update every task)

- **Current milestone:** M1 — Database + auth (see `docs/15_BUILD_PLAN.md`)
- **Last completed task:** M0 Scaffold (monorepo, lint, typecheck, CI, tokens, root scripts)
- **Next task:** M1 Database + auth (Drizzle schema, Better Auth, migration, /login, /app)
- **Blockers:** —
- **Last green check:** 2026-10-17 (`npm run build`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run dev`)

## 1. Milestone checklist (copy of docs/15 milestones — tick only when its "Verify" step passed)

- [x] M0 Scaffold (monorepo, lint, typecheck, CI)
- [ ] M1 Database + auth (Neon, Drizzle, Better Auth, workspace bootstrap)
- [ ] M2 Core domain (crypto, HMAC, state machines, ranking, preflight) + unit tests
- [ ] M3 Integrations (GitHub App, Vercel token, Services wizard)
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

## 3. Deviations from the docs (anything built differently than specified)

| What | Spec said | Built instead | Reason |
|---|---|---|---|
| Package Manager | pnpm | npm | User specified npm/bun preference, selected npm |

## 4. Verified external facts (things you checked in real docs / node_modules types)

Record every API shape you verified so you never guess twice. Format: `fact — source (URL or node_modules path) — date`.

- Turborepo requires `packageManager` in root `package.json` when using npm workspaces — CLI output — 2026-10-17
- Next 16.4.2 Turbopack builds and resolves `@firebreak/core` via `main`/`exports` map in root dependencies — 2026-10-17
- `nanoid` customAlphabet works in `@firebreak/core` ESM bundle targeting node22 via tsup — 2026-10-17

## 5. Environment variables status

| Var | Where (web / mcp / fixtures) | Set locally? | Set in prod? |
|---|---|---|---|
| DATABASE_URL | web, mcp, core | Yes (.env) | No |
| DATABASE_URL_UNPOOLED | web, mcp, core | Yes (.env) | No |
| BETTER_AUTH_SECRET | web | Yes (.env) | No |
| GITHUB_OAUTH_CLIENT_ID | web | Yes (.env) | No |
| GITHUB_OAUTH_CLIENT_SECRET | web | Yes (.env) | No |
| GITHUB_APP_ID | web | Yes (.env) | No |
| GITHUB_APP_PRIVATE_KEY | web | Yes (.env) | No |
| ENCRYPTION_KEY | web, mcp | Yes (.env) | No |
| STATE_SECRET | web | Yes (.env) | No |
| VERCEL_TOKEN | fixtures | Yes (.env) | No |

## 6. Commands that work

```bash
npm run dev            # parallel core watch and next dev
npm run build          # turbo build core + web
npm run typecheck      # turbo typecheck across packages
npm run test           # vitest run in core
npm run lint           # eslint in web
```

## 7. Known issues / TODO (small, local)

- None for M0.

## 8. File map (only important files, one line each)

- `package.json`: Root monorepo configuration with npm workspaces and turbo scripts
- `turbo.json`: Turborepo pipeline configuration with dependency outputs
- `tsconfig.base.json`: Base TypeScript compiler options
- `apps/web/src/app/globals.css`: Firebreak design tokens (night/day shift palettes)
- `apps/web/src/app/page.tsx`: Initial home page importing `@firebreak/core`
- `packages/core/src/index.ts`: Main entry point for `@firebreak/core`
- `packages/core/src/util/ids.ts`: Prefixed ID generator (`newId`)
- `packages/fixtures/package.json`: Alert & break fixture scripts runner
