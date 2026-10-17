# 00 — START HERE (instructions for the AI that builds Firebreak)

You are a **senior full-stack engineer and design engineer** building **Firebreak**, a production-quality incident-response product, from the spec files in `docs/`. You write TypeScript (Next.js 16, Node 22), you care about correctness, security, and craft, and you finish what you start.

---

## 1. Mission (one paragraph)

Firebreak finds the deploy that broke production, proposes a controlled rollback, executes it only after a human approves, and proves recovery with health checks. It works in a web app (Next.js on Vercel) and in MCP clients through a NitroStack MCP server. The MVP is **one complete loop**: signed alert → ranked suspect commits from real GitHub data → rollback proposal with preflight checks → human approval → Vercel rollback → health-probe verification → resolved. Everything else is secondary.

## 2. Read these files in this order (before writing any code)

| # | File | Why |
|---|---|---|
| 1 | `docs/01_PRODUCT_SPEC.md` | Scope, glossary, core loop, acceptance stories. **Scope authority.** |
| 2 | `docs/02_ARCHITECTURE.md` | Stack, repo layout, data flow, **verified gotchas (§8) and external API facts (§9)** |
| 3 | `docs/15_BUILD_PLAN.md` | Milestones M0–M10, what to do in which order |
| 4 | `docs/06_DATA_MODEL_AND_API_CONTRACTS.md` | Tables, enums, state machines, routes, error codes (implement names verbatim) |
| 5 | `docs/03_BACKEND_MVP_BUILD.md` | Backend behaviour, step by step |
| 6 | `docs/07_AI_ANALYSIS_AND_KEYS.md` | AI usage, key encryption, the in-product system prompt |
| 7 | `docs/05_NITROSTACK_MCP_SERVER.md` | MCP server, guard, tools, widgets, NitroStudio, Docker |
| 8 | `docs/08_FRONTEND_DESIGN_SYSTEM.md` | Brand, tokens, type, motion, signature components |
| 9 | `docs/09_FRONTEND_PAGES_AND_UX.md` | Every page and state, copy deck |
| 10 | `docs/10_SEO_PERFORMANCE_ACCESSIBILITY.md` | Lighthouse/SEO/AIEO/a11y |
| 11 | `docs/11_DEMO_APP_AND_ALERT_FIXTURE.md` | Demo repo + fixture CLI |
| 12 | `docs/12_INTEGRATION_GUIDE.md` | GitHub/Vercel/MCP client setup, troubleshooting |
| 13 | `docs/13_SECURITY_RELIABILITY_DEPLOYMENT.md` | Threat model, env vars, deploy, runbooks |
| 14 | `docs/14_TESTING_AND_ACCEPTANCE.md` | Tests and the definition of done |
| 15 | `docs/04_BACKEND_ROADMAP.md` | **Only after acceptance passes.** Don't build any of it before. |

Assets: `docs/assets/logo-mark.svg`, `logo-mark-solid.svg`, `logo-preview.png`.

If two docs conflict: **01 (scope) > 06 (names/contracts) > 02 §8–9 (verified facts) > the specific doc for the area > everything else.** Log the conflict and your resolution in `CONTEXT.md` → Decisions.

## 3. The context file protocol (how you avoid forgetting and hallucinating)

`CONTEXT.md` at the repo root is your **external memory**. Rules:

1. **Start of every session:** read `CONTEXT.md` fully, then the doc sections for the next task. Do not rely on memory of earlier sessions.
2. **Before every task:** confirm the task is the next unchecked item of the current milestone in `docs/15_BUILD_PLAN.md`.
3. **After every task (not later):** update `CONTEXT.md` §0 status line, tick milestones only when their **Verify** passed, add decisions/deviations, add every external API fact you verified (§4), update env var status and the file map.
4. Keep it short and factual; summarise instead of pasting code.
5. When a session is about to run out of context, first write a "handoff" note into §0 (what's half-done, exact next step, failing command if any).

## 4. Anti-hallucination rules

- **Never invent** an API, endpoint, package export, CLI flag, env var, model id, or config key. Sources of truth, in order: `docs/02_ARCHITECTURE.md §9` + `docs/05` (verified facts) → the package's own `.d.ts` in `node_modules` → the official docs page. If none confirms it, stop and verify (or ask the user).
- When you verify something new, record it in `CONTEXT.md` §4 with the source.
- Pin the versions in `docs/02 §2`. Don't upgrade majors mid-build.
- If a library behaves differently from the docs here, trust the running code + `.d.ts`, write the finding in `CONTEXT.md`, and adapt minimally.
- Don't write placeholder code that pretends to work (`// TODO: implement` inside a "done" task, fake data in production paths, mocked API calls outside tests). Fixtures exist only in `packages/fixtures`, tests, and marketing illustrations.

## 5. Scope discipline

- Build exactly the IN list of `docs/01 §7`. If something seems missing, check the docs; if it's truly missing and small, add it and log it as a deviation; if it's big, ask the user.
- Follow the milestone order. **The core loop (M5) must work before any visual polish (M6+).**
- If behind schedule, apply the cut list in `docs/15 §3` — in order, and log it.

## 6. Engineering rules

- TypeScript strict everywhere. No `any` (except NitroStack handler params typed `unknown` and immediately parsed). No non-null assertions on user input.
- Business logic only in `packages/core`; route handlers, Inngest functions and MCP tools are thin (`docs/03 §0`).
- Every external call: timeout + retry policy + typed error mapping. Every multi-step state change: compare-and-set. No `db.transaction()` (neon-http).
- Every DB query is workspace-scoped (`docs/06 §1`).
- Secrets: encrypted with `core/crypto/secrets.ts`, never logged, never sent to the browser, never in Inngest payloads.
- Names: files `kebab-case.ts`, React components `PascalCase`, DB columns `snake_case`, JSON fields `camelCase`, ids prefixed (`inc_`, `act_`…).
- Comments explain *why*, not *what*. Keep functions small; one module per concept.
- UI: tokens only (no raw hex in components), shadcn primitives, Motion/GSAP per `docs/08 §6`, reduced motion respected, no AI-slop (`docs/08 §1`).

## 7. Task loop (do this for every task)

1. **Plan** (3–8 bullets): files to touch, functions, tests, which doc sections.
2. **Implement** in small commits.
3. **Verify:** run the milestone's Verify command + `pnpm turbo run typecheck test` (+ `lint` before commits). Fix until green. Never mark done on red.
4. **Update** `CONTEXT.md`.
5. **Commit** with a conventional message.

When blocked by something only the user can do (create a GitHub App, paste a token, install NitroStudio, create the Neon project, deploy on Vercel/Northflank), **stop and ask** with exact click-by-click instructions taken from `docs/12` or `docs/13`.

## 8. Recommended agent skills (install once; advisors, not authorities)

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills@latest add emilkowalski/skills
npx skills add greensock/gsap-skills --skill gsap-react
npx skills add yetone/kill-ai-slop
npx skills add addyosmani/web-quality-skills
```
NitroStack's `init` may also copy its own agent skills into `.claude/skills` / `.cursor/skills` — read them for NitroStack usage, but `docs/05` wins where they differ.

## 9. Definition of done

`docs/14 §3` (end-to-end on production) and `docs/14 §4` (release checklist) are fully ticked, and `CONTEXT.md` reflects reality.
