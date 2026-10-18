# PROMPT.md — paste these into your AI coding assistant

Put this folder (`docs/`, `CONTEXT.md`, `PROMPT.md`, `.env.example`) at the root of an empty `firebreak` repo first.

---

## Prompt 1 — first session (kickoff)

```text
You are a senior full-stack engineer and design engineer. We are building "Firebreak" in this repository.

Firebreak finds the deploy that broke production, proposes a controlled rollback, executes it only after a human approves, and proves recovery with health checks. Web app: Next.js 16 on Vercel. Backend logic: a shared TypeScript package + Inngest workflows + Neon Postgres. MCP server: NitroStack (tested in NitroStudio). Real GitHub data, a real Vercel test deployment, and a controlled alert fixture.

Before writing any code:
1. Read docs/00_START_HERE.md completely and follow it exactly. It tells you the reading order, the rules, and how to use CONTEXT.md as your memory.
2. Read the docs in the order it lists (at least 01, 02, 15, 06, 03 now; the others when their milestone starts).
3. Reply with: (a) a 10-line summary of the product and the core loop, (b) the milestone list from docs/15 with your understanding of each "Verify" step, (c) every question or missing input you need from me (accounts, tokens, decisions), (d) the exact plan for milestone M0.
Then wait for my "go".

Hard rules: never invent APIs, package exports, CLI flags, env vars or model ids — use docs/02 §9, docs/05, the packages' .d.ts files, or official docs, and record what you verified in CONTEXT.md §4. Update CONTEXT.md after every task. Don't start a milestone before the previous one's Verify passed. Don't build anything from docs/04 until docs/14 acceptance passes.
```

## Prompt 2 — every new session (resume)

```text
Resume building Firebreak. First read CONTEXT.md fully, then docs/00_START_HERE.md §3–§7, then the doc sections for the next task listed in CONTEXT.md §0. Tell me in 5 lines: where we are, what's next, any blocker. Then continue with the task loop (plan → implement → verify → update CONTEXT.md → commit). Stop and ask me when you need something only I can do.
```

## Prompt 3 — start of a milestone

```text
Start milestone <M#> from docs/15_BUILD_PLAN.md. Re-read the doc sections it references. Give me the task list with files you'll create/change and the Verify command, then implement task by task. Tick the milestone in CONTEXT.md only after Verify passes.
```

## Prompt 4 — when something breaks

```text
Something is failing: <paste error / command output>. Do not guess. 1) Reproduce it with the smallest command. 2) Find the exact file and line. 3) Check docs/02 §8 gotchas and docs/12 Part E troubleshooting. 4) Check the library's .d.ts / official docs if an external API is involved. 5) Propose the minimal fix, apply it, re-run the failing command and the milestone's Verify. 6) Record the cause and fix in CONTEXT.md (Known issues or Verified facts).
```

## Prompt 5 — design pass (Day 2)

```text
Do a design-engineering pass on <page/section> using docs/08 and docs/09. Check: tokens only, type scale, spacing rhythm, motion purpose and reduced-motion behaviour, mobile 360/390 px, focus states, contrast, no AI-slop items from docs/08 §1, Lighthouse impact. List problems first, then fix them. Keep text on screen minimal.3


```

## Prompt 6 — final review

```text
Run the full acceptance in docs/14 (§2 tests, §3 end-to-end script, §4 release checklist). Report each item as PASS/FAIL with evidence (command output, screenshot description, scores). Fix FAILs one by one and re-run. Update CONTEXT.md and README.
```
