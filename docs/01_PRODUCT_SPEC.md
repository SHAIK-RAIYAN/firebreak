# 01 — Product Spec: Firebreak

> Read after `00_START_HERE.md`. This file defines **what** Firebreak is and **what the MVP must do**.
> If any other doc conflicts with this file on scope, this file wins.

---

## 1. One-liner

**Firebreak finds the deploy that broke production, proposes a controlled rollback, executes it only after a human approves, and proves the service recovered.**

A *firebreak* is a strip of land cleared on purpose so a wildfire cannot spread. Firebreak (the product) is the controlled gap between "production is on fire" and "the fire spreads to every user".

## 2. The problem

When an error spike starts right after a deploy, the on-call engineer loses the first 20–30 minutes doing the same manual steps every time:

1. Which deploy is live? What was live before it?
2. Which commits changed between them?
3. Which of those commits touches the code in the stack trace?
4. Is it safe to roll back? To which deployment?
5. Did the rollback actually fix it, or did it just *feel* fixed?

Every step is mechanical and deterministic. Firebreak does them in seconds, with evidence, and keeps a human in control of the one step that changes production.

## 3. What makes Firebreak different (product principles)

| Principle | Meaning in code |
|---|---|
| **Evidence, not guesses** | Suspect ranking is a deterministic scoring algorithm over real GitHub data. Same inputs → same output. AI only *explains*; it never decides. |
| **Controlled action** | Every action is a typed *plan* with preflight checks. Nothing touches production without an explicit human approval. |
| **Proof of recovery** | An action is not "done" when the API returns 200. It is done when health probes prove recovery. |
| **Everything on the record** | Every step writes an append-only timeline event. |
| **Works where you work** | Same capabilities in the web app and in any MCP client (NitroStudio, Claude, Cursor) through a NitroStack MCP server. |

## 4. Users

- **Primary:** a developer / small team shipping a Next.js (or any) app on **Vercel** from **GitHub**.
- **Context:** they get an alert (MVP: a signed webhook, later Sentry/uptime checks), open Firebreak (web or MCP client), and want to be back to green fast.

## 5. Glossary (use these exact words everywhere: UI copy, code, DB, docs)

| Term | Definition |
|---|---|
| **Workspace** | Tenant boundary. MVP: one personal workspace auto-created per user. Every row belongs to one workspace. |
| **Service** | One thing Firebreak protects = GitHub repo + production branch + Vercel project + health URL. |
| **Connection** | Stored credentials for a provider (GitHub App installation, Vercel token). |
| **Alert** | A signed signal that something is wrong (MVP: HTTP webhook). |
| **Incident** | A tracked problem on a Service, created from one or more alerts. Has a status and a timeline. |
| **Deployment** | A Vercel production deployment (id, url, git SHA, created time, state). |
| **Bad deployment** | The production deployment live when the incident opened. |
| **Last good deployment** | The most recent READY production deployment created before the bad one, with a different SHA. |
| **Suspect** | A commit between last good and bad, with a deterministic score and evidence. |
| **Evidence** | A concrete fact supporting a suspect: e.g. "changed `lib/pricing.ts` lines 40–52; stack frame `lib/pricing.ts:47`". |
| **Analysis** | Optional AI-written explanation of the most likely cause and possible code fixes. Advisory only. |
| **Action** | A controlled change to production. MVP has one type: `rollback` (Vercel promote/rollback to last good deployment). |
| **Preflight** | Checks run before an action is allowed: target READY, target ≠ current, production unchanged since proposal (no drift), approval not expired. |
| **Approval** | A human decision (approve / reject) on an action. Expires after 15 minutes. |
| **Verification** | Repeated health probes after execution that decide `verified` or `verification_failed`. |
| **Timeline** | Ordered, append-only list of everything that happened in an incident. |

## 6. The core loop (the MVP is exactly this, end to end)

```
DETECT ──► TRACE ──► PROPOSE ──► APPROVE ──► EXECUTE ──► VERIFY
 alert      rank       rollback    human       Vercel       health
 webhook    suspects   plan +      clicks      rollback     probes →
 → incident (GitHub)   preflight   approve     API          resolved / failed
```

1. **Detect** — A signed alert hits `POST /api/v1/alerts/{serviceId}`. Firebreak verifies the HMAC signature, dedupes, opens an Incident (or attaches to the open one).
2. **Trace** — Firebreak reads the current production deployment and the last good deployment from Vercel, fetches the commit range from GitHub, and ranks suspect commits against the stack frames in the alert.
3. **Analyse (optional, non-blocking)** — If an AI key is available, an LLM explains the likely cause and suggests code fixes, citing suspect IDs. If no key or the call fails, the loop continues without it.
4. **Propose** — Firebreak creates a `rollback` Action targeting the last good deployment, runs preflight, and sets status `awaiting_approval`.
5. **Approve** — A signed-in human approves or rejects in the web app. MCP clients can read and propose; they can approve **only** with a key that was explicitly given the "Approve rollbacks" permission (off by default). Approval itself triggers execution — there is no separate "execute" button or tool. See `05_NITROSTACK_MCP_SERVER.md`.
6. **Execute** — Preflight runs again (drift check). If still valid, Firebreak calls the Vercel rollback API exactly once (compare-and-set on status).
7. **Verify** — Firebreak probes the Service health URL every 10 s for up to 3 min. 3 consecutive healthy probes → `verified` → incident `resolved`. Timeout or failure → `verification_failed` → incident `mitigation_failed` (human must act).

## 7. MVP scope

### IN (must ship, all working end to end)

1. Marketing home page + SEO basics (see docs 08–10).
2. Sign in with GitHub. Personal workspace auto-created.
3. Connect GitHub through a **GitHub App** installation (user picks repos/org).
4. Connect Vercel with a user-provided **access token** (encrypted at rest).
5. Create a Service with a 4-step wizard; generates a per-service **alert signing secret**.
6. Alert intake webhook with HMAC-SHA256 + timestamp replay protection + dedupe.
7. Incident list + incident detail page with live status (polling).
8. Deterministic suspect ranking with evidence.
9. AI analysis with BYO keys (OpenAI, Anthropic, Google, xAI) or the platform default key (rate-limited). Keys encrypted (AES-256-GCM).
10. Rollback action: propose → approve/reject → execute → verify.
11. Timeline (audit log) per incident.
12. NitroStack MCP server: 9 tools, 3 widgets, API-key auth (custom guard), tested in NitroStudio, deployed over Streamable HTTP.
13. MCP key management page with copy-paste client config.
14. Demo app + alert fixture CLI that produce a **real** broken deploy and a **real** recovery (doc 11).
15. Dark + light theme, responsive, first-visit loader, ASCII fire hero.

### OUT (do not build in MVP — listed in `04_BACKEND_ROADMAP.md`)

Slack, public status pages, Sentry/Datadog/PagerDuty ingest, built-in uptime monitors, teams/RBAC/invites, OAuth 2.1 for MCP, "revert PR" action, feature-flag kill switch, postmortem export, email notifications, billing, multi-cloud (Netlify/Render), auto-rollback without approval.

**Rule:** if a feature is not in the IN list, do not build it, even if it looks easy. A finished small loop beats a half-built big platform.

## 8. User stories + acceptance criteria

| # | Story | Acceptance criteria |
|---|---|---|
| U1 | As a visitor I understand Firebreak in 30 s. | Home hero states problem + loop; "Start free" goes to `/login`. Lighthouse SEO 100. |
| U2 | As a user I sign in with GitHub. | GitHub OAuth → `/app`. A workspace row exists. Session survives refresh. |
| U3 | I connect GitHub. | "Install GitHub App" → GitHub → back to `/app/integrations` with installation saved and repos listed. |
| U4 | I connect Vercel. | Paste token (+ optional team id) → validated with a live API call → stored encrypted → projects listed. |
| U5 | I create a Service. | Wizard: repo → Vercel project → health URL (live-checked) → shows alert secret + `curl` / fixture command. |
| U6 | An alert opens an incident. | Valid signed POST → 202 + incident id. Bad signature → 401. Same fingerprint while open → attached, no new incident. |
| U7 | I see suspects with evidence. | Within ~10 s, incident shows bad/good deployments, ranked commits, score, evidence chips, GitHub links. |
| U8 | I read an AI explanation. | If a key works: summary, likely cause (cites suspect), fix suggestions, confidence. If not: a quiet "Analysis unavailable" state. Loop not blocked. |
| U9 | I approve a rollback. | Action card shows target deployment + preflight checklist; Approve → executing → verifying → resolved, live. |
| U10 | Firebreak proves recovery. | Probe chart fills in; 3 consecutive healthy probes → `verified`; incident `resolved`; timeline complete. |
| U11 | Failure is honest. | If the probe never recovers in 3 min → `verification_failed`, incident `mitigation_failed`, clear message. |
| U12 | I use Firebreak from an MCP client. | Create MCP key → connect NitroStudio → `list_incidents`, `get_incident` (widget), `get_suspects` (widget), `get_analysis`, `propose_rollback`, `get_action_status` (widget) work; `approve_action` is refused without the approve permission. |
| U13 | I manage AI keys safely. | Add/replace/delete per provider; only last 4 chars shown; key validated on save; plaintext never returned to the browser. |

## 9. Demo script (this is the definition of "complete")

1. Demo app (doc 11) is healthy in production on Vercel.
2. Run `pnpm fixture:break` → it pushes 3 real commits (one is the bug) → Vercel deploys → `/api/health` starts returning 500.
3. Run `pnpm fixture:fire` → it reads the real failing health response and sends a signed alert.
4. Open Firebreak → new incident → suspects ranked → the bad commit is #1 with evidence `lib/pricing.ts`.
5. AI analysis explains the bug and suggests the fix.
6. Click **Approve rollback** → Firebreak rolls back on Vercel → probe chart turns green → **Resolved** in under ~2 minutes.
7. Repeat steps 2–6 from an MCP client (NitroStudio locally, Claude Code against production); the approve step is a link to the web app.
8. Run `pnpm fixture:reset` to restore the demo.

If all 8 steps work on the deployed URLs, the MVP is done.

## 10. Non-functional requirements

| Area | Target |
|---|---|
| Alert → suspects ready | p95 < 10 s |
| Approve → Vercel rollback call | < 5 s (event dispatch + drift re-check) |
| Web Lighthouse (home, mobile) | Perf ≥ 90, A11y 100, Best Practices 100, SEO 100 |
| Web Lighthouse (home, desktop) | Perf ≥ 97 |
| Security | Secrets encrypted at rest; HMAC on alerts; every query scoped by workspace; no plaintext key ever sent to browser or logs |
| Reliability | Each external call: timeout + retry with backoff; action executes at most once; every workflow step idempotent |
| Cost | $0 on free tiers (Vercel Hobby, Neon Free, Inngest Free, free Node host) |
