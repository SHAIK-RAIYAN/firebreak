# 15 — Build Plan (2 days, milestone by milestone)

> Strategy: **Day 1 = the core loop works end to end, ugly is fine. Day 2 = MCP, design, deploy.**
> A complete small loop beats a beautiful half loop. If you fall behind, use the cut list (§3) — never cut the loop.
> Honest estimate: ~18–20 focused hours with an AI coding assistant. Don't start the roadmap (doc 04).

Work protocol for every task: **read the referenced doc sections → implement → run the Verify command → update `CONTEXT.md` → commit** (`feat(core): …`, `feat(web): …`, `feat(mcp): …`, `chore: …`).

---

## Day 1 — the loop

### M0 · Scaffold (≈ 45 min) — docs 02 §2–3
- [ ] `pnpm init` root; `pnpm-workspace.yaml` (`apps/*`, `packages/*`); `turbo.json`: `build` dependsOn `^build` (outputs `dist/**`, `.next/**`, `src/widgets/out/**`); **`typecheck` and `test` also dependsOn `^build`** (apps read `@firebreak/core` types from `dist/`); `lint` no deps; `dev` `persistent: true`, `cache: false`.
- [ ] `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `moduleResolution: bundler` for web/core; the MCP app keeps its own tsconfig).
- [ ] `apps/web`: `pnpm create next-app@latest web --ts --app --tailwind --eslint --src-dir --import-alias "@/*"` (Next 16, Tailwind 4). Package name `@firebreak/web`.
- [ ] `packages/core` with tsup (doc 03 §1). `packages/fixtures` (tsx scripts).
- [ ] Prettier, ESLint, `.editorconfig`, `.gitignore`, root `.env.example` (doc 13 §2), CI workflow (doc 13 §3.2).
- [ ] Root scripts: `dev` = `turbo run dev` (core `tsup --watch` + web `next dev` in parallel), `build`, `typecheck`, `lint`, `test`, `fixture:*` (doc 11 §3.1).
- [ ] Design tokens (doc 08 §3–5) in `apps/web/src/app/globals.css` now, so every later screen uses them. shadcn init.
- **Verify:** `pnpm turbo run build typecheck` green; `pnpm dev` shows the Next page.

### M1 · Database + auth (≈ 1 h) — docs 06 §2, 03 §2, 02 §9 Better Auth
- [ ] Neon project + `dev` branch; `DATABASE_URL(_UNPOOLED)` in `apps/web/.env.local` and `packages/core/.env`.
- [ ] Drizzle schema for **all** tables (06 §2) + Better Auth tables; generate + apply migration.
- [ ] Better Auth (GitHub OAuth App for dev, doc 12 A1); `/api/auth/[...all]`; `auth-client`; `requireSession`; workspace bootstrap hook; `src/proxy.ts` redirect for `/app/*`.
- [ ] Minimal `/login` (button) and `/app` (shows user + workspace id).
- **Verify:** sign in → `/app` shows your workspace; `select * from workspaces` has 1 row; sign out works.

### M2 · Core domain + tests (≈ 1.5 h) — docs 03 §0, §3, §6, §9.1, 06 §3, 07 §3
- [ ] `util/*`, `domain/errors.ts`, `crypto/*`.
- [ ] `domain/state.ts` (both machines), `domain/ranking.ts`, `domain/preflight.ts`.
- [ ] Tests: doc 14 §2 items 1–4. The demo ranking case uses inline data in `packages/core/test/fixtures/demo.ts` (doc 03 §6.5) — `packages/fixtures` comes later in M4.
- **Verify:** `pnpm --filter @firebreak/core test` green.

### M3 · Integrations + services (≈ 1.5 h) — docs 03 §4–5, 12 A2 + B, 06 §5.2–5.3, 11 §2
- [x] Create the **dev GitHub App** (doc 12 A2). Install flow, callback, (webhook can wait for prod).
- [x] Vercel adapter + connect endpoint; GitHub adapter; probe + SSRF.
- [x] Services API + a plain wizard page (shadcn form, no polish).
- [x] Create **`firebreak-demo`** repo + Vercel project (doc 11 §2), baseline commit deployed, `/api/health` = 200.
- [x] Log raw Vercel `getProject` + one deployment once → confirm `targets.production` and `meta.githubCommitSha` → `CONTEXT.md` §4.
- **Verify:** demo service created in the UI; secrets are ciphertext in DB. (VERIFIED)

### M4 · Alert intake + incident pipeline (≈ 1.5 h) — docs 06 §4, 03 §7, §10, 11 §3
- [x] `/api/v1/alerts/[serviceId]` route; `ingestAlert`.
- [x] Inngest client/events in core; `/api/inngest`; functions `incident-pipeline`, `incident-retrace`; services `traceIncident`, `proposeRollback`.
- [x] Fixtures: `break.ts`, `fire.ts`, `static-alert.json`, templates.
- [x] Run Inngest Dev Server: `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`.
- **Verify:** `pnpm fixture:break` then `pnpm fixture:fire` (FIREBREAK_URL=localhost) → incident with ranked suspects, top = the bad commit; action `awaiting_approval` in DB. (VERIFIED)

### M5 · Approve → execute → verify (≈ 1.5 h) — docs 03 §9, §10
- [x] Approve/reject routes; `action-execute` + `action-expiry` functions; `executeAction`, `confirmProduction`, `recordProbe`, `finishVerification`, `expireAction`; manual resolve/dismiss/retrace routes.
- [x] Minimal incident page: status, suspects list, action card with Approve/Reject, probes list; polling every 2 s.
- [x] `reset.ts` fixture.
- [x] Tests: doc 14 §2 items 5–8 (DB-backed ones if a test branch is available).
- **Verify (MILESTONE):** local full loop: break → fire → approve → Vercel rolls back → 3 healthy probes → Recovered → reset. **Commit and tag `loop-works`.** (VERIFIED)

---

## Day 2 — product quality

### M6 · App UI + AI (≈ 3 h) — docs 09 §4, 08 §7.4, 07
- [ ] App shell: sidebar, top bar, ⌘K, theme toggle, Geist Mono in app layout.
- [ ] Incident room complete (header, LoopRail, deployments, suspects + DiffBlock, explanation, timeline, action card states, HoldToConfirm, ProbeStrip, live region).
- [ ] Overview (onboarding checklist + stats), incidents list, services wizard polish, integrations page.
- [ ] AI: `models.ts`, keys API + settings page, `incident-analysis` function, bundle/sanitize + tests (14 §2 items 9–10).
- [ ] MCP keys API + settings page (create/revoke/show-once/snippets).
- **Verify:** loop again from the UI only; analysis appears with your key; keys masked; mobile 390 px usable.

### M7 · NitroStack MCP server (≈ 2 h) — doc 05
- [ ] Scaffold with `@nitrostack/cli` (05 §2), read the template once, then build guard + identity + KeyService.
- [ ] 9 tools with NitroStack `z` schemas + `Schema.parse`; core read services they need (`getIncidentCard`, `listIncidentsView`, `getSuspectsView`, `getAnalysisView`, `getTimelineView`, `getActionStatusView`, `resolveIncidentRef`).
- [ ] 3 widgets (inline styles, theme-aware) + `widget-manifest.json` examples.
- [ ] NitroStudio pass (05 §9) — every tool, every widget, auth failure.
- [ ] HTTP mode + `smoke.ts`; Dockerfile builds and runs locally.
- **Verify:** smoke passes locally; Studio demo conversation works.

### M8 · Marketing site + SEO (≈ 3 h) — docs 08, 09 §2, 10
- [ ] Fonts (Mona Sans, Geist, Departure Mono local), logo/icons, nav, footer.
- [ ] `AsciiFire` (+ interactive break), hero, ticker.
- [ ] Problem section, Loop section (pinned), Evidence, MCP (beams + terminal + widget), Security bento, FAQ, final CTA.
- [ ] Loader (first visit).
- [ ] TerrainScene (lazy) — **first item to cut** if late.
- [ ] `sitemap.ts`, `robots.ts`, `manifest.ts`, OG image, JSON-LD, `llms.txt`, `llms-full.txt`, `/docs/mcp`, legal pages, 404.
- **Verify:** Lighthouse local (doc 10 §7) meets targets; reduced-motion pass; 360 px no horizontal scroll.

### M9 · Deploy (≈ 1 h) — doc 13 §3
- [x] Prod Neon migrate; GitHub OAuth App + GitHub App linked and verified for workspace owner; Vercel project `firebreak` configured with monorepo build command and 19 production env vars synced; live at `https://firebreak-pi.vercel.app` (VERIFIED).
- [x] NitroStack MCP server built, 3 widgets compiled, verified with `apps/mcp/scripts/verify-server.ts` and `smoke.ts` passing 9 tools and auth guard (VERIFIED).
- [ ] Northflank container deployment for MCP server (requires Northflank token/service creation) and Inngest production signing key.
- [x] Demo service in prod (`firebreak-demo` at `https://firebreak-demo-pi.vercel.app/api/health` 200 OK); fixtures `.env` configured.
- **Verify:** Vercel production `/api/health` returns 200 OK with connected database; live Gemini AI analysis passes regression test; bad signature rejected with 401; unauthenticated MCP requests rejected.

### M10 · Hardening (≈ 1 h) — docs 13 §1, 14 §4
- [x] Ops scripts `ops:reencrypt`, `ops:cancel-action` (doc 13 §6) and `test:ai` (doc 07 §7.1).
- [x] Acceptance checks: bad signature rejected 401; MCP unauthenticated access rejected; real Gemini AI prompt regression passes; ESLint 0 errors 0 warnings; Next.js 16 full static prerendering passes.
- **Verify:** 106 Vitest unit tests green, typecheck 100% clean, build clean.

---

## 3. Cut list (apply in this order if behind schedule)

1. TerrainScene → static poster image only.
2. Pinned Loop section → simple stacked steps (same panels).
3. First-visit loader → none.
4. ⌘K palette.
5. `suspect-list` and `action-status` widgets → keep `incident-card` only (tools still return JSON).
6. Platform default AI key → BYOK only.
7. Analysis retry button, timeline auto-scroll niceties.

**Never cut:** signed alerts, ranking with evidence, preflight + drift check, human approval, single execution, health verification, timeline, workspace isolation, encrypted secrets, the 9 MCP tools with the guard, SEO files, mobile layout.

## 4. Daily stop rule

End of Day 1 without `loop-works` tag → Day 2 starts with M5 again, and M8 shrinks to: hero (fire), loop (stacked), security, FAQ, CTA, SEO files.
