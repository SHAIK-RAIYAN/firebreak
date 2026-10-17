# 09 — Frontend Pages, UX Flows, and Copy

> Every page: purpose → layout → components → states (loading / empty / error / live) → copy.
> Keep text on screen minimal. If a sentence can be a label, make it a label. If a label can be a number, show the number.

---

## 1. Route map

| Route | Type | Auth | Rendering |
|---|---|---|---|
| `/` | Marketing home | public | static (RSC) + client islands |
| `/privacy`, `/terms` | Legal | public | static |
| `/docs/mcp` | Connect-your-client guide (SEO + AIEO) | public | static (MDX or TSX) |
| `/login` | Sign in | public (redirects to `/app` if signed in) | dynamic |
| `/app` | Overview | session | dynamic |
| `/app/incidents` | Incident list | session | dynamic |
| `/app/incidents/[id]` | Incident room | session | dynamic + polling |
| `/app/services` | Services list | session | dynamic |
| `/app/services/new` | Create-service wizard | session | client |
| `/app/services/[id]` | Service settings | session | dynamic |
| `/app/integrations` | GitHub + Vercel connections | session | dynamic |
| `/app/settings/ai` | AI provider keys | session | dynamic |
| `/app/settings/mcp` | MCP keys + client setup | session | dynamic |
| `/app/settings/account` | Profile, sign out | session | dynamic |
| `not-found` | 404 | public | static |

Route groups: `(marketing)` layout = nav + footer + Lenis + loader; `(auth)` = bare; `app/` = sidebar shell. `/app/*` is `noindex`.

---

## 2. Marketing home `/` — scroll story

Global: 12-col grid, hairline grid texture only in hero + final CTA, Lenis smooth scroll, GSAP reveals. Each section has a pixel-font index label `[0X] NAME` at top-left.

### 2.0 Loader (first visit only) — see 08 §7.2.

### 2.1 Navigation (sticky)
- Left: mark + `firebreak`. Center (≥ md): `How it works` · `Evidence` · `MCP` · `Security` · `FAQ` (anchor links, Lenis `scrollTo` with offset). Right: `Sign in` (ghost) · `Start free` (accent-solid).
- Transparent over hero; after 24 px scroll: `--bg` at 80% + `backdrop-filter: blur(8px)` + bottom hairline (Motion, 200 ms).
- Mobile: mark + `Start free` + menu button → full-screen sheet with large display links; focus trapped; `Esc` closes.

### 2.2 Hero `[00] INCIDENT RESPONSE`
- Layout: full viewport height (`min-h-[100svh]`). Text block bottom-left (cols 1–8); ASCII fire full-bleed in the bottom 55% behind text (canvas `aria-hidden`), with the interactive **break gap** following the cursor.
- Label: `[ FOR TEAMS SHIPPING ON VERCEL + GITHUB ]`
- H1 (display-1): **Stop the spread.** It is **visible at first paint** (it is the LCP element): no `opacity: 0` initial state in CSS or SSR. The SplitText line reveal animates `transform` only (lines from `y: 0.35em` to `0`, 700 ms), starts immediately on hydration (underneath the loader on first visits), and is skipped under reduced motion.
- Second line (display-2, `--fg-muted`): **Roll back with proof.**
- Sub (body-lg, max 46ch): "Firebreak finds the deploy that broke production, rolls it back when you approve, and proves it recovered."
- CTAs: `Start free` (accent-solid) · `See the loop ↓` (ghost, scrolls to §2.4).
- Bottom strip (pixel font, 11 px, `--fg-subtle`), a looping "ticker" typed line-by-line (Motion), 4 lines:
  `02:14:07  ALERT     checkout /api/health 500`
  `02:14:09  SUSPECT   9f1c2e7 refactor: support stacked discounts  +79`
  `02:14:41  APPROVED  rollback → 3ab9d04`
  `02:15:12  VERIFIED  3/3 healthy · recovered in 65s`
- Reduced motion: static text, fire static frame.

### 2.3 Problem `[01] THE FIRST 20 MINUTES`
- Two columns. Left title (display-2): "The slowest part of an incident is the part a script could do."
- Right: a vertical **clock list** — six rows, each `02:14 → 02:41` style timestamps on the left (pixel font) and a one-line manual step on the right ("Which deploy is live?", "What changed since the last good one?", "Which commit touches this stack trace?", "Is it safe to roll back? To what?", "Did it actually recover?"). On scroll, each row gets struck through (`text-decoration` animated via a 1 px line `scaleX`) and the timestamp collapses to `02:14` → final row: **"With Firebreak: 02:14 → 02:15."**
- No icons, no cards.

### 2.4 The loop `[02] HOW IT WORKS` (pinned)
- Desktop (≥ 1024): section pinned for ~6 × 60vh with GSAP ScrollTrigger `scrub: 0.6`. Left sticky column: giant step index (`01`…`06`, display-1, pixel font) + step name (display-2) + 1-line description. Right: a **real UI panel** (built from the app's actual components with fixture data) that morphs per step:
  1. **DETECT** — "A signed alert opens an incident." Panel: alert JSON block with a green `✓ signature v1 valid` line, `StatusPill open`.
  2. **TRACE** — "Real commits, ranked by evidence." Panel: 3 `SuspectRow`s sliding in; top one gets points bar fill `79`.
  3. **PROPOSE** — "A rollback plan with preflight checks." Panel: action card, preflight checklist ticking ✓ one by one.
  4. **APPROVE** — "Nothing changes until a human says so." Panel: `HoldToConfirm` button filling, cursor glyph.
  5. **EXECUTE** — "Vercel switches production back." Panel: two deployment pills (`9f1c2e7` bad / `3ab9d04` good) swapping positions with a Motion layout transition; label `production →`.
  6. **VERIFY** — "Recovered only when health checks agree." Panel: `ProbeStrip` filling 3 green, `StatusPill resolved`, `65s`.
- `LoopRail` across the top of the panel shows progress.
- Mobile / reduced motion: not pinned; six stacked blocks, each with its panel.

### 2.5 Evidence `[03] EVIDENCE, NOT GUESSES`
- Title: "Every suspect comes with receipts."
- Left (cols 1–7): `DiffBlock` of `lib/pricing.ts` with the `stacked.reduce` line marked; above it the error line `TypeError: Cannot read properties of undefined (reading 'reduce')` with `reduce` highlighted in `--ember`.
- Right (cols 8–12): score breakdown table (mono): `file lib/pricing.ts +40`, `symbol applyDiscount +25`, `token 'reduce' +10`, `recent +4` → total **79** (matches doc 03 §6.4 rules exactly). Caption (small, muted): "Deterministic. Same inputs, same ranking."
- Below: collapsible "Explanation" card labelled `ADVISORY` (pixel font) showing the analysis summary + one fix suggestion. No AI iconography; the label is just `EXPLANATION · CLAUDE SONNET 5.5` style text.

### 2.6 Interlude — the break (three.js terrain)
- Full-bleed, 80vh, `TerrainScene` (08 §7.3) scrubbed by scroll: fire front crosses the ASCII terrain and stops at the cleared strip.
- One line overlaid bottom-left (display-2, wdth 100): "A firebreak is a gap cleared on purpose."
- Second line (body-lg, muted): "Ours sits between a bad deploy and your users."

### 2.7 MCP `[04] WORKS WHERE YOU WORK`
- Title: "Same loop, inside your MCP client."
- Left: Magic UI `AnimatedBeam` diagram — three text nodes (pixel font) `NITROSTUDIO`, `CLAUDE CODE`, `CURSOR` → node `FIREBREAK MCP` → node `CORE` → nodes `GITHUB`, `VERCEL`. Beams animate once on enter, then idle.
- Right: a terminal block with tabs `Claude Code | Cursor | NitroStudio` showing the real setup snippet (doc 12) and below it an **incident-card** re-implemented as a web component with the same layout as the MCP widget (the widget app is a separate Next 14 build and can't be imported), static fixture data.
- Tool list (mono, 9 lines): `list_incidents · get_incident · get_suspects · get_analysis · get_timeline · propose_rollback · get_action_status · approve_action · list_services`.
- Footnote: "Built with NitroStack."

### 2.8 Safety `[05] SECURITY`
- Bento grid (4 tiles, Magic UI `bento-grid` restyled; hairline borders, no gradients):
  1. "Human approval, always." — mini `HoldToConfirm` illustration.
  2. "Drift-checked before it runs." — preflight list.
  3. "Keys sealed with AES-256-GCM." — masked key `sk-••••••••3f9a`.
  4. "Every step on the record." — 4 timeline lines.
- Each tile: title (title size) + ≤ 12-word line.

### 2.9 FAQ `[06] FAQ`
Accordion (shadcn), 6 items, answers ≤ 50 words, also emitted as FAQPage JSON-LD:
1. *Does Firebreak change production on its own?* — No. Every rollback needs a human approval, and Firebreak re-checks production right before executing.
2. *What does it need access to?* — A GitHub App with read access to the repos you choose, and a Vercel token. Nothing else.
3. *How does it pick the bad commit?* — A deterministic score: files and functions in the error, changed lines, risky files, recency. The same inputs always give the same ranking.
4. *What is the AI used for?* — Explaining the evidence and suggesting fixes. It never decides what to roll back.
5. *Which AI providers?* — Anthropic, OpenAI, Google, xAI with your own key, or the built-in default with a daily limit.
6. *What is MCP?* — An open protocol that lets AI clients like Claude Code or Cursor use tools. Firebreak's MCP server is built with NitroStack.

### 2.10 Final CTA
- Hairline grid texture returns. display-1: **Ship on Friday.** display-2 muted: **Sleep on Saturday.**
- `Start free` button. Embers (small `AsciiFire`, intensity 0.35) along the bottom edge, fading out.

### 2.11 Footer
Mark + wordmark, 3 link columns (Product: How it works, MCP, Security · Resources: Docs, GitHub, Status (placeholder link to GitHub) · Legal: Privacy, Terms), small line "Built with NitroStack, Next.js and Inngest." and `© 2026 Firebreak`.

---

## 3. Auth `/login`

- Split layout ≥ md: left 55% — `AsciiFire` (interactive, intensity 0.8) with the logo lockup bottom-left and the line "Stop the spread."; right 45% — centered card (max 380 px): mark, H1 (title) "Sign in", sub "Use your GitHub account.", button **Continue with GitHub** (GitHub's official mark as an inline SVG — lucide's brand icons are deprecated; this is the one place a third-party logo is allowed), tiny legal line linking Terms/Privacy.
- Mobile: fire becomes a 160 px band on top.
- States: button loading spinner; error toast (sonner) if OAuth fails (`?error=` param).
- After sign-in → `next` param or `/app`.

---

## 4. App shell `/app/*`

### 4.1 Layout
- **Sidebar** (shadcn `sidebar`, collapsible to 64 px icons, state in cookie): header = mark + workspace name (truncated); groups:
  - `Overview` (`LayoutDashboard`) · `Incidents` (`Flame`, with a count badge of active incidents, `--warn` if any awaiting approval) · `Services` (`Server`) · `Integrations` (`Plug`)
  - **Settings**: `AI keys` (`KeyRound`) · `MCP` (`TerminalSquare`) · `Account` (`UserRound`)
  - Footer: connection health dots (`GitHub ●`, `Vercel ●` green/red) and the user avatar menu (theme switch, docs, sign out).
- **Top bar** (56 px): breadcrumb, ⌘K button (`Search` icon + `⌘K` kbd), theme toggle, user avatar.
- **⌘K command palette** (cmdk): Go to incidents/services/settings, "Create service", "Copy MCP URL", recent incidents (by `INC-n`).
- Content max width 1280 px, padding 24 px (16 mobile). Mobile: sidebar becomes a sheet (hamburger in top bar).
- `Geist Mono` loaded only here. No Lenis here (native scroll).

### 4.2 Data fetching pattern
- Server components fetch initial data via `@firebreak/core` services directly (no HTTP hop) and pass to client components.
- Client components use **TanStack Query v5** for mutations and polling against `/api/v1/*` (`QueryClient` created per request on the server, singleton in the browser; `staleTime: 60_000` default; incident detail overrides).
- Mutations: optimistic only for harmless toggles; approvals are **never** optimistic (wait for 200).
- Errors: envelope `error.code` → user copy map (`lib/error-copy.ts`). Toasts via sonner; inline errors in forms.

### 4.3 Overview `/app`
- **If onboarding incomplete:** a 4-step checklist card (`LoopRail` style): `Connect GitHub` → `Connect Vercel` → `Create a service` → `Fire a test alert` — each with one primary button and a ✓ when done. This is the first-run experience; nothing else competes on the page.
- **Else:** 
  - Row of 3 stats (Animate UI sliding numbers): `Active incidents`, `Median time to recover (30d)`, `Rollbacks verified (30d)`.
  - "Active" list (max 5) of incident rows (see 4.4) or empty state.
  - Services list: name, repo, Vercel project, status (`Clear` / `INC-12 verifying`).
- Empty state (no active incidents): small static ASCII ember + "No fires." + muted "Last incident resolved 2 days ago."

### 4.4 Incidents `/app/incidents`
- Tabs: `Active` · `Resolved` · `All` (URL `?status=`). Filter: service select.
- Table (desktop) / stacked cards (mobile). Columns: `INC-12` (pixel), title, service, `StatusPill`, opened (relative, tooltip absolute UTC), duration (live for active), top suspect short SHA.
- Row click → incident room. Keyboard: `j/k` move, `Enter` opens.
- Pagination: "Load more" (cursor).
- Loading: 6 skeleton rows. Empty: per tab ("No active incidents." / "Nothing resolved yet.").

### 4.5 Incident room `/app/incidents/[id]` (the most important screen)
Polling: TanStack Query `refetchInterval: 2000` while status ∈ {open, triaged, awaiting_approval, mitigating, verifying}; `false` otherwise; pause when tab hidden (`refetchIntervalInBackground: false`).

**Header**: `INC-12` (pixel, muted) · title (title size) · `StatusPill` (live) · meta line: service · opened `02:14:07 UTC` · duration `00:01:05` (ticking) · severity. Right: `More` menu → `Mark resolved`, `Dismiss`, `Retry trace` (if failed), `Copy link`.

**LoopRail** under the header with the 6 steps reflecting current state.

**Grid (≥ lg)**: main (8 cols) + rail (4 cols, sticky top 72 px). Mobile: Action card first, then the rest.

Main column:
1. **Deployments** strip: `PRODUCTION (bad)` `9f1c2e7` · created · link ↗ → arrow → `LAST GOOD` `3ab9d04` · created · link ↗. Note if `shaMismatch`.
2. **Suspects** card: `SuspectRow` × N (default 3, "Show all"). Header shows trace confidence (`HIGH` / `LOW — no file in the error matched a change`). Expand a row → `DiffBlock` per matched file using the stored `files[].patchExcerpt` (no extra request) + "View on GitHub ↗".
3. **Explanation** card (`ADVISORY` label, provider · model, confidence): summary, likely cause (links to the suspect row), fix suggestions (each collapsible, patch in `DiffBlock`), unknowns (muted list). States: pending (skeleton + "Analysing evidence…"), skipped (one line + link to AI settings), failed ("Couldn't analyse — Retry").
4. **Timeline** (vertical, newest at bottom, auto-scroll when new events arrive unless the user scrolled up): time (mono), actor glyph (system/user/mcp/ai as 1-letter pixel badges `S`/`U`/`M`/`A`), summary.

Rail — **Action card** by status:
- *No target*: "No earlier production deployment to roll back to." + `Mark resolved`.
- *awaiting_approval*: title "Roll back to `3ab9d04`", target meta, preflight checklist (✓ ok, ✕ blocking fail, ! warning), expiry countdown (sliding number, turns `--warn` under 2 min), buttons: **Approve rollback** (opens dialog with summary; inside, `HoldToConfirm`) and `Reject` (dialog with optional note). If proposed via MCP: small line "Proposed from MCP (key: laptop)".
- *approved/executing*: spinner line "Rolling back on Vercel…" with step text from timeline; `LoopRail` step EXECUTE live.
- *verifying*: `ProbeStrip` + latency sparkline + "2 / 3 healthy checks" (text-scramble on change).
- *verified*: big ✓ in `--ok`, "Recovered in 65 s", banner: "Vercel paused auto-deploys after the rollback. Promote your fix in Vercel when it's ready." (link to Vercel project).
- *verification_failed / failed / cancelled / expired / rejected*: reason in plain language (from `error_code` map) + next step button (`Propose again` when allowed).

Accessibility: live region (`aria-live="polite"`) announces status changes ("Rollback approved", "Recovered"). All actions reachable by keyboard; `A` opens approve dialog when focused in rail (documented in ⌘K help).

### 4.6 Services
- `/app/services`: list + `New service` button. Card per service: name, repo (`owner/name`), Vercel project, health URL (truncate middle), active incident pill.
- `/app/services/new` **wizard** (4 steps, progress `LoopRail`-style, each step one decision):
  1. **Repository** — searchable list from `GET /integrations/github/repos`; if empty → inline "Install the GitHub App" button.
  2. **Vercel project** — list; auto-select the project whose `link.repo` matches the chosen repo (show "Matched by repo"). Production branch prefilled from project link or repo default branch.
  3. **Health check** — URL input (prefilled `https://<productionUrl>/api/health`), `Check now` → shows status/latency inline (`POST /services/health-check`); expected status (default 200).
  4. **Alert secret** — created on submit; shown **once** with copy button + warning; tabs with ready-to-run snippets: `Fixture CLI` (`pnpm fixture:fire` env lines) and `curl` (with an `openssl` HMAC one-liner). Button `Done` → service page.
- `/app/services/[id]`: details form (name, health URL, expected status, branch), `Rotate alert secret` (alert-dialog, shows new secret once), snippets again (without the secret value), `Archive service` (danger zone, type the service name to confirm).

### 4.7 Integrations `/app/integrations`
- **GitHub** card: list of installations (`account login`, type, repo selection `All repos` / `Selected`, `Configure on GitHub ↗` link to `https://github.com/settings/installations/{id}` or org equivalent). Button `Add organization or repositories` → `/api/v1/integrations/github/install`; secondary link `Link existing installation` → `/api/v1/integrations/github/link` (returns to `?link=1`, which opens a dialog listing candidate installations with checkboxes → `Link`). Status if suspended.
- **Vercel** card: not connected → `Connect Vercel` dialog: token (password input with reveal), optional Team ID, link "Create a token ↗" (https://vercel.com/account/tokens), helper text "Team- or project-scoped tokens are recommended." Connected → account label, `••••last4`, `Replace` / `Disconnect`.

### 4.8 AI keys `/app/settings/ai` (doc 07 §8)
- Mode segmented control: `Firebreak default` | `My own key` (+ remaining quota "14 of 20 left today").
- 4 provider cards in a 2×2 grid: provider name (text), status (`Not connected` / `••••3f9a · Claude Sonnet 5.5`), model select (from `models.ts`), `Add key` / `Replace` / `Remove`, radio "Use for analysis".
- Add-key dialog: password input + `Validate & save` → inline result. Never show the full key again.
- Privacy line (one sentence, doc 07 §8).

### 4.9 MCP `/app/settings/mcp`
- Top: server URL (`NEXT_PUBLIC_MCP_URL`) with copy button + status dot (fetches `GET {MCP_URL}/health`… use `/mcp/health` via a server action to avoid CORS).
- Keys table: name, prefix `fbk_8Hq2…`, permissions (chips), last used, created, `Revoke`.
- `Create key` dialog: name; permissions checkboxes: `Read incidents` (on, locked), `Propose rollbacks` (on), `Approve rollbacks` (off; when checked shows warning "Anyone with this key can change production through an MCP client."). On create → show-once modal with the key + copy.
- **Connect a client** tabs with copy-ready snippets (doc 12 §3) — the key is filled in only right after creation; otherwise `<YOUR_KEY>` placeholder.

### 4.10 Account `/app/settings/account`
Avatar, name, GitHub login, workspace name (editable), theme preference, `Sign out`. (Delete workspace → roadmap.)

### 4.11 Not found
Centered React Bits `ASCIIText` "404", line "Nothing burning here.", button `Back to safety` → `/`.

---

## 5. UX rules (apply everywhere)

- One primary action per view; it's always `accent-solid`. Destructive actions are never primary color; they live in menus or danger zones.
- Every async action shows: pressed state (≤ 100 ms), progress (spinner inside the button, width stable), result (toast or inline).
- Relative times with absolute UTC in tooltips. Durations as `mm:ss` / `hh:mm:ss`.
- Copy buttons switch to `Copied` for 1.5 s (`Check` icon).
- Forms: label above input, helper text below, error replaces helper (red), submit disabled only while submitting (not for validation — validate on submit + on blur).
- Touch targets ≥ 44 px on mobile. Hit areas of icon buttons ≥ 32 px desktop.
- Skeletons match final layout dimensions (no CLS).
- Never show raw error codes alone; map to sentences, keep the code in a muted `(VERCEL_PLAN_LIMIT)` suffix for support.

## 6. Copy deck (UI strings — reuse verbatim)

| Key | Text |
|---|---|
| status.open | Investigating |
| status.triaged | Triaged |
| status.awaiting_approval | Needs approval |
| status.mitigating | Rolling back |
| status.verifying | Verifying |
| status.resolved | Recovered |
| status.mitigation_failed | Still failing |
| status.dismissed | Dismissed |
| err.VERCEL_PLAN_LIMIT | Vercel's Hobby plan only allows rolling back to the immediately previous deployment. |
| err.ACTION_EXPIRED | This approval window closed. Propose the rollback again. |
| err.drift | Production changed after approval, so the rollback was cancelled. |
| err.vercel_unauthorized | Your Vercel token was rejected. Reconnect Vercel. |
| err.github_access | Firebreak can't read this repository. Check the GitHub App's repository access. |
| err.verification_failed | Still failing after 3 minutes. Production is on the previous deployment. Investigate manually. |
| action.awaiting_approval | Needs approval |
| action.approved | Approved — starting |
| action.executing | Rolling back |
| action.verifying | Verifying |
| action.verified | Verified |
| action.verification_failed | Still failing |
| action.failed | Rollback failed |
| action.rejected | Rejected |
| action.expired | Expired |
| action.cancelled | Cancelled |
| err.preflight_failed | Safety checks failed, so no rollback was proposed. See the checklist. |
| err.vercel_job_failed | Vercel reported the rollback job as failed. Check the project in Vercel. |
| err.vercel_confirm_timeout | Vercel didn't confirm the switch in time. Check the project in Vercel before retrying. |
| err.VERCEL_REJECTED | Vercel rejected the rollback. |
| err.VERCEL_UNAVAILABLE | Vercel didn't respond. Try again in a minute. |
| err.upstream_unavailable | GitHub or Vercel didn't respond. Retry the trace. |
| err.vercel_not_connected | Connect Vercel to trace this incident. |
| err.NO_ROLLBACK_TARGET | No earlier production deployment to roll back to. |
| err.INSTALLATION_CLAIMED | This GitHub installation is linked to another Firebreak workspace. |
| err.INSTALLATION_NOT_ACCESSIBLE | Your GitHub account can't access that installation. |
| err.reconnect | Finish connecting from Firebreak: use "Add organization or repositories". |
| err.DISPATCH_FAILED | Couldn't start the rollback. Nothing changed. Try again. |
| err.QUOTA_EXCEEDED | Today's free explanations are used up. Add your own AI key. |
| err.INVALID_SIGNATURE | Alert signature didn't match. |
| empty.incidents | No fires. |
| analysis.skipped | Add an AI key to get explanations. |
