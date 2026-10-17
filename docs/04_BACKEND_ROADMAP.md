# 04 — Backend Roadmap (what to add after the MVP loop works)

> Big backend file #2 of 2. **Do not start anything here until `docs/14` acceptance passes on production.**
> Order is by value ÷ effort. Each item lists: why → design → schema → API/MCP → UI → effort → risks.
> Every addition must keep the MVP invariants: deterministic decisions, human approval for production changes, proof of recovery, append-only timeline, workspace scoping.

---

## Phase R1 — Harden what exists (½–1 day)

### R1.1 "Restore auto-deploys" action (fixes Vercel gotcha G2 inside the product)
- **Why:** after a rollback Vercel stops auto-assigning production; users forget and their next fix "doesn't deploy".
- **Design:** new action type `promote`. After `verified`, the incident page shows a banner: "Vercel auto-deploys are paused. When your fix is deployed, promote it." Firebreak lists READY production deployments newer than the rollback target (`GET /v7/deployments?…&state=READY`) whose `readySubstate` is `STAGED`, and proposes `promote(deploymentId)` with the same approve → execute (`POST /v10/projects/{id}/promote/{dep}`) → confirm (`lastAliasRequest.type === "promote"`) → verify loop.
- **Schema:** `actions.type` gains `'promote'`; nothing else (target/from already generic).
- **MCP:** `propose_promote { incident, deployment? }`.
- **Effort:** S. **Risk:** a deployment that was already promoted cannot be promoted again (Vercel rule) → filter those out.

### R1.2 Observability of Firebreak itself
- Sentry (free dev plan) in `apps/web` and `apps/mcp` for exceptions; release = git SHA.
- OpenTelemetry-style `traceId` = incident id propagated in logs (`logger.child({ incidentId })`) across web → Inngest → MCP.
- `/app/admin/health` page (owner only): last Inngest run per function, failure counts (Inngest API), Neon latency, MCP `/mcp/health`.
- **Effort:** S.

### R1.3 Test depth
- Playwright E2E of the full loop with MSW-mocked GitHub/Vercel and Inngest Dev Server in CI (`docker compose` with web + inngest dev).
- Contract tests that replay recorded real Vercel/GitHub responses (fixtures captured once with secrets scrubbed).
- Load test the polling endpoint (k6, 50 concurrent viewers × 2 s) → p95 < 250 ms.

### R1.4 Rate limiting at the edge
- Upstash Redis (free) + `@upstash/ratelimit` for `/api/v1/alerts/*` and auth routes (sliding window). Keep `usage_counters` for quotas.

---

## Phase R2 — Signals in (where real alerts come from) (1–2 days)

### R2.1 Sentry ingest (highest value: real stack frames with source maps)
- **Why:** the fixture proves the loop; Sentry makes it real. Sentry stack traces are symbolicated → exact `file:line` → ranking jumps to `file_exact` + `line_in_hunk`.
- **Design:** Sentry **Internal Integration** per workspace (user pastes client secret) or a public Sentry integration later. Webhook `POST /api/v1/ingest/sentry/{serviceId}` → verify `sentry-hook-signature` (HMAC-SHA256 of body with client secret) → map `event.exception.values[].stacktrace.frames[]` (`filename`, `lineno`, `function`, `in_app`) to `Frame[]` (only `in_app: true`) → reuse `ingestAlert` core path (refactor: `ingestNormalizedAlert(service, payload)`).
- `fingerprint` = Sentry issue id; `observed.sha` = `release` if it is a SHA.
- **Schema:** `service_signal_sources (id, workspace_id, service_id, kind 'webhook'|'sentry'|'uptime', config jsonb, secret sealed, created_at)`.
- **UI:** Service → Signals tab → "Connect Sentry" with copy-paste webhook URL.
- **Effort:** M. **Risk:** Sentry payload variants (issue alert vs metric alert) → handle only issue alerts first.

### R2.2 Built-in uptime checks
- **Design:** Inngest cron function `monitor-tick` every 5 min (`triggers: { cron: "*/5 * * * *" }`) → fan-out `monitor/check` per active service → probe → on N consecutive failures (default 2) → `ingestNormalizedAlert` with `source: "monitor"`, fingerprint `monitor:${serviceId}`; the failing response body (if JSON with `error.frames`) becomes frames.
- **Budget math:** 1 service × 288 checks/day × ~2 executions ≈ 17k/month → fits the 50k free tier for 1–2 services; document the limit; paid tier for more.
- **Schema:** `monitors (service_id pk, interval_min, failure_threshold, enabled, last_status, consecutive_failures, last_checked_at)`.
- **Effort:** S–M.

### R2.3 Generic integrations
- Better Stack / UptimeRobot / Grafana / Datadog webhooks via **payload mappers** (`mappers/<provider>.ts` → `AlertPayload`). Each mapper has fixtures + tests. Effort S each.

---

## Phase R3 — Humans in the loop where they already are (1–2 days)

### R3.1 Slack app
- **Why:** on-call lives in Slack; approval from Slack is the #1 requested workflow.
- **Design:**
  - Slack app with OAuth v2 install per workspace (`chat:write`, `channels:manage`, `commands`, `users:read`, `users:read.email`).
  - On incident open → create channel `#inc-12-pricing` (or post to a configured channel) → message with Block Kit: status, top suspect, buttons **Approve rollback** / **Reject** / **Open in Firebreak**.
  - Interactivity endpoint `POST /api/v1/slack/interactivity` → verify `X-Slack-Signature` (v0 HMAC of `v0:${ts}:${body}` with signing secret, 5-min window) → map Slack user → Firebreak user (by verified email or explicit link) → `approveAction(..., { via: "slack" })`.
  - Threaded updates for every timeline event of type `action_*`, `verified`, `verification_failed` (Inngest function `notify-slack` on those events).
- **Schema:** `slack_installations (workspace_id, team_id, bot_token sealed, channel_id_default)`, `slack_user_links (workspace_id, user_id, slack_user_id)`, `incident_channels (incident_id, channel_id, root_ts)`; `actions.decided_via` gains `'slack'`.
- **Security:** approval from Slack requires the linked Firebreak user to have permission (R4.1); unlinked users get an ephemeral "Link your account" message.
- **Effort:** M. **Risk:** Slack rate limits (chat.postMessage ~1/s per channel) → queue via Inngest with `throttle`.

### R3.2 Public status page
- **Option A (recommended, zero deps):** Firebreak-hosted `/{workspaceSlug}/status` (static ISR page, revalidate 30 s) showing services + incident history. Status updates are **drafted** automatically from the timeline (template, not AI) and **published only after approval** ("Publish update" button) — public communication is a production action too.
- **Option B:** Instatus/Atlassian Statuspage API adapters (`statuspage.ts`) with the same draft → approve → publish flow.
- **Schema:** `status_pages (workspace_id, slug unique, title, public bool)`, `status_updates (id, incident_id, body, state 'draft'|'published', published_at, published_by)`.
- **Effort:** S (A) / M (B).

### R3.3 Notifications
- Email via Resend (free tier) for: incident opened, approval requested (with deep link), verified/failed. Web Push later.
- `notification_prefs (user_id, channel, event, enabled)`.

---

## Phase R4 — Teams and governance (1–2 days)

### R4.1 Teams, roles, invites
- Roles: `owner`, `responder` (can approve), `viewer`. `workspace_members.role` already exists.
- Invites: `workspace_invites (id, workspace_id, email, role, token_hash, expires_at, accepted_at)`; accept flow after GitHub login.
- Workspace switcher in the sidebar. Every `requireSession` resolves the **selected** workspace (cookie) and checks membership.
- **Policy:** `approveAction` requires `responder|owner`. Optional **two-person rule** per service (`services.require_two_approvals`): proposer ≠ approver; or 2 distinct approvers.

### R4.2 Policies engine (deterministic)
- `policies (id, workspace_id, service_id null, rule jsonb, enabled)` evaluated by a pure function `evaluatePolicies(context) → { requireApproval: boolean, approversNeeded: number, blockReasons: string[] }`.
- Rules: deploy freeze windows, max rollbacks per hour, "only roll back to deployments older than X min", severity gates.
- **Auto-mitigation (opt-in, later):** if severity `critical` AND trace confidence `high` AND top suspect points ≥ 60 AND a policy allows it → execute without approval, notify, and require verification; one auto-action per incident; kill switch per workspace. This is the most dangerous feature — ship last, behind a flag.

### R4.3 Audit export
- `GET /api/v1/audit?from&to` → NDJSON of timeline events across incidents; signed URL download. Useful for SOC 2 evidence.

---

## Phase R5 — More controlled actions (2–4 days)

### R5.1 Revert PR action (code-level fix instead of infra rollback)
- **Why:** rollback is instant but temporary; the real fix is reverting the bad commit.
- **Design:** GitHub App permissions add **Contents: write, Pull requests: write, Checks: read**. Action `revert_pr { sha }`:
  1. Create branch `firebreak/revert-<shortsha>` from production branch head (Git Data API: get commit → create tree from parent's tree for the changed files → create commit with message `Revert "<msg>"` → create ref). For multi-parent/merge commits → refuse.
  2. Open PR with body generated from the timeline (template).
  3. Wait for checks (`check_suite` webhooks or polling `GET /commits/{ref}/check-runs`).
  4. On approval → merge (`PUT /pulls/{n}/merge`, method `squash`) → Vercel deploys → if auto-assignment is paused (after rollback) propose `promote` (R1.1) → verify loop.
- **Schema:** `actions.type` += `'revert_pr'`; `actions.target` holds `{ sha, prNumber, branch }`.
- **Effort:** L. **Risk:** conflicts when later commits touched the same lines → detect via GitHub `mergeable` and fall back to "open PR for manual resolution".

### R5.2 Feature-flag kill switch
- Vercel **Edge Config** adapter (flag item in an Edge Config store; `PATCH /v1/edge-config/{id}/items`), plus LaunchDarkly/Statsig adapters later.
- Map suspects → flags via `flag_bindings (service_id, path_glob, flag_key)` (e.g. `lib/pricing/**` → `stacked_discounts`). Proposal: "Turn off `stacked_discounts`" — faster and narrower than a rollback.
- **Effort:** M.

### R5.3 Multi-platform rollback
- Adapter interface `DeployPlatform { getCurrentProduction, getRollbackTarget, rollback, confirm, promote }` — refactor the Vercel adapter behind it first (do this refactor only when adding the second platform).
- Netlify (`POST /api/v1/sites/{site_id}/rollback` / restore deploy), Render (rollback to a previous deploy), Fly.io (`fly releases` + `fly deploy --image`), Kubernetes (Argo Rollouts `abort`/`undo`).

---

## Phase R6 — Smarter evidence (2–3 days)

- **Source maps:** accept uploaded source maps per deployment (`POST /api/v1/services/{id}/sourcemaps`) or read from Sentry → symbolicate bundled frames server-side (`source-map` package) → exact paths/lines for non-Sentry alerts.
- **Blame-aware ranking:** for `line_in_hunk`, also check `git blame` of the frame line at the bad SHA (GraphQL `blame`) → direct hit if the line was last touched by a suspect commit (+40).
- **Dependency diff:** when `package.json`/lockfile changed, compute changed package versions and link changelogs; evidence kind `dependency_change`.
- **Historical learning (still deterministic):** per-file incident history (`file_incident_counts`) adds small prior points (+0–5) to frequently-faulty files.
- **Analysis evals:** a stored set of 20 incidents with expected properties; nightly run against the configured model; track regression.

---

## Phase R7 — MCP platform upgrades (1–2 days)

### R7.1 OAuth 2.1 for MCP (no copy-pasted keys)
- NitroStack has `OAuthModule.forRoot({ required, resourceUri, authorizationServers, scopesSupported, audience, issuer, … })` + `OAuthGuard` + `createScopeGuard([...])` (verified exports in 1.1.2).
- Authorization server options: Better Auth's OAuth/OIDC provider capabilities (verify current plugin for MCP OAuth at build time) or Auth0/WorkOS. Flow: MCP client discovers protected-resource metadata → user logs in with GitHub on Firebreak → consent screen listing scopes (`incidents:read`, `actions:propose`, `actions:approve`) → token → `OAuthGuard`.
- Keep API keys for CI/scripts. Identity mapping still goes through the WeakMap `identity(ctx)` pattern.
- Unlocks: Claude.ai custom connectors and ChatGPT apps without `mcp-remote`.

### R7.2 More MCP surface
- **Resources:** `firebreak://incidents/{id}/timeline.md`, `firebreak://services/{id}/runbook.md` (user-authored runbooks the model can read).
- **Prompts:** `triage-incident` (guided conversation: list → incident → suspects → analysis → propose).
- **Tasks/long-running:** NitroStack supports `taskSupport` on tools — make `approve_action` return a task the client can follow until verified (verify NitroStack task API + issue #329 TTL bug first).
- **Multi-instance:** NitroStack sessions/rate limits are in-memory → to scale beyond 1 instance, use sticky sessions or stateless protocol mode and a Redis rate limiter (NitroStack issue #27 notes no Redis example yet).

---

## Phase R8 — Product polish & business (ongoing)

- **Postmortems:** "Generate postmortem" → Markdown doc from timeline + analysis (AI writes prose sections only; facts are template-filled) → export to GitHub issue / copy.
- **Metrics dashboard:** MTTR, time-to-suspect, rollback success rate, incidents per service (SQL views + charts).
- **Pre-merge risk check (shift-left):** GitHub Check Run on PRs that touch files with incident history → "This file caused INC-12 and INC-19".
- **Billing:** Stripe Checkout + webhooks; plan limits (services, monitors, AI quota).
- **Data retention:** prune `probes` > 30 days, keep incidents/timeline; Neon paid when > 1 GB.
- **Compliance:** CSP headers, dependency scanning (Dependabot/Renovate), secret scanning in CI (gitleaks), key rotation runbook (`ENCRYPTION_KEY_PREVIOUS` re-encryption job as an Inngest function).

---

## Recommended order after MVP

1. R1.1 Restore auto-deploys → 2. R2.1 Sentry → 3. R3.1 Slack → 4. R3.2 Status page (A) → 5. R4.1 Teams → 6. R7.1 MCP OAuth → 7. R5.1 Revert PR → 8. R2.2 Uptime → 9. R6 evidence → 10. R4.2 policies/auto-mitigation (last).

## Schema change rules (for every roadmap item)

- New tables only; additive columns with defaults; never rename in place (add + backfill + switch + drop later).
- Every new table has `workspace_id` + index, and a repo module with workspace-first functions.
- Every new action type extends `ActionStatus` flow without new states; if a new state is unavoidable, update doc 06 §3 tables and the pure state machine + tests first.
- Every new external integration: adapter with timeouts/retry/error mapping, msw tests, recorded fixtures, secrets sealed with AAD.
