# 12 — Integration Guide (operators, users' repos/orgs, alerts, MCP clients) + Troubleshooting

> Part A is for **you** (the person deploying Firebreak). Part B is what **users** do to connect their own repos/orgs. Part C covers alerts, Part D MCP clients, Part E troubleshooting.
> Ship Part B–E (shortened) as the public page `/docs/mcp` + in-app helper text.

---

## Part A — One-time platform setup (operator)

Create **separate** dev and prod apps for each provider (local URLs differ from prod URLs).

### A1. GitHub OAuth App (sign-in) — https://github.com/settings/developers → OAuth Apps → New
| Field | Value |
|---|---|
| Application name | Firebreak (dev) / Firebreak |
| Homepage URL | `http://localhost:3000` / `https://<your-domain>` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` / `https://<your-domain>/api/auth/callback/github` (Better Auth's default GitHub callback path) |
→ `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`.

### A2. GitHub App (repo access) — https://github.com/settings/apps → New GitHub App
| Field | Value |
|---|---|
| GitHub App name | `firebreak-<you>` (globally unique; becomes `GITHUB_APP_SLUG`) |
| Homepage URL | your site |
| **Callback URL** | `https://<your-domain>/api/v1/integrations/github/callback` (dev: `http://localhost:3000/...` — a browser redirect, so localhost works) |
| **Request user authorization (OAuth) during installation** | ✅ **Required.** GitHub then sends the installer back to the Callback URL with `code` + `installation_id`; Firebreak exchanges the code and checks `GET /user/installations` to prove the user really has access to that installation (prevents installation hijacking). With this enabled, GitHub disables the Setup URL — that's expected. |
| Setup URL / Redirect on update | not used (repo lists are read live, so repo-selection changes need no redirect) |
| Webhook | Active ✅, URL `https://<your-domain>/api/v1/integrations/github/webhook`, secret = random 32 bytes → `GITHUB_WEBHOOK_SECRET`. (Dev: GitHub cannot reach localhost — either leave webhook inactive in the dev App or use a `smee.io` channel.) |
| Repository permissions | **Contents: Read-only**, **Metadata: Read-only** (mandatory). Nothing else. |
| Subscribe to events | none needed (`installation` / `installation_repositories` are delivered to the App webhook automatically) |
| Where can this be installed | **Any account** (so users can install it on their own orgs) |
After creating: note **App ID** → `GITHUB_APP_ID`; the App's **Client ID** → `GITHUB_APP_CLIENT_ID` and **Generate a new client secret** → `GITHUB_APP_CLIENT_SECRET` (used only for the install-time ownership check; different from the A1 OAuth App); **Generate a private key** → put the PEM in `GITHUB_APP_PRIVATE_KEY` as a single line with `\n` escapes.

### A3. Vercel (for the product itself)
Deploy `apps/web` as a Vercel project (doc 13). Users bring their own Vercel tokens — there is no platform Vercel credential.

### A4. Inngest
Install the Inngest integration from the Vercel Marketplace on the `apps/web` project (it sets `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` and syncs on deploy). Copy `INNGEST_EVENT_KEY` to the MCP host too.

---

## Part B — Connecting a user's repos / orgs (in the product)

### B1. Prerequisites on the user's side
1. The app is deployed on **Vercel** with the **Vercel ↔ GitHub Git integration** (pushes to the production branch create production deployments). This is what puts `meta.githubCommitSha` on every deployment; without it, ranking has no commit range.
2. A **health endpoint** on the production domain (B4).
3. Permission to install a GitHub App on the repo's owner account (org owners can install directly; org members can *request* it and an owner approves).

### B2. Connect GitHub (repos and organizations)
1. `/app/integrations` → **Add organization or repositories** → GitHub's install page.
2. Pick the **account** (personal or an org) → choose **All repositories** or **Only select repositories** → Install.
3. GitHub asks you to authorize Firebreak (one click), then redirects to Firebreak's callback with `code` + `installation_id`. Firebreak proves your GitHub account can access that installation (`GET /user/installations`), checks the signed `state`, then saves it to your workspace.
4. Repeat for every org you want. Each org = one installation row.
5. To change which repos Firebreak can see later: **Configure on GitHub ↗** (from the card) → change selection → come back to Firebreak; the repo list is read live, so it is already up to date.

Rules the product enforces:
- An installation belongs to **one** Firebreak workspace. Installing an already-claimed installation from another workspace shows `INSTALLATION_CLAIMED` (security: prevents reading someone else's repos by guessing ids).
- Org installation **pending owner approval** → nothing comes back until approved. After the owner approves (on GitHub), the user clicks **Link existing installation** on the GitHub card: Firebreak runs a plain GitHub authorization with the App's client id (`https://github.com/login/oauth/authorize?client_id=…&state=…`), comes back to the same callback with `code` but **no** `installation_id`, lists `GET /user/installations`, and lets the user pick which unclaimed installations to link.
- Callback without `code` (e.g. someone bookmarked it) → "Finish connecting from Firebreak" message; nothing is saved.
- If the App is uninstalled or suspended on GitHub, the webhook marks it; affected services show "Reconnect GitHub".

### B3. Connect Vercel
1. Create a token at https://vercel.com/account/tokens.
   - **Recommended:** a **Team-scoped** token (or **Project-scoped**, prefix `vcp_`, if Firebreak should only ever see one project). Team/project-scoped tokens need no Team ID.
   - Personal Hobby account: a normal token, no Team ID.
   - Full-account token used for a team's project: also paste the **Team ID** (Team Settings → General).
2. `/app/integrations` → **Connect Vercel** → paste token (+ Team ID if needed) → Firebreak validates it live (`GET /v2/user`, lists projects) and stores it encrypted.
3. Token permissions needed: read projects/deployments, create rollbacks/promotions on the chosen projects.

### B4. Health endpoint contract
- `GET` on the **production domain** (not a protected `*-hash.vercel.app` URL), no auth, < 2 s.
- Returns the expected status (default 200) only when the critical path works ("deep" health check, like the demo's pricing check).
- **Recommended:** JSON body containing `"sha": process.env.VERCEL_GIT_COMMIT_SHA`. Firebreak then also confirms that the healthy response comes from the rolled-back SHA (stronger proof).
- On failure, returning `{ "error": { "type", "message", "frames": [{file,line,function}] }, "hint": { "file", "function" } }` lets the fixture/your forwarder produce much better suspects.
- Must not be cached: `export const dynamic = "force-dynamic"` (Next.js) or `Cache-Control: no-store`.

### B5. Create a Service
`/app/services/new` → Repository → Vercel project (auto-matched by repo) → Health check (live test) → **Alert secret shown once** (store it in your alert sender's secrets).

---

## Part C — Sending alerts

Endpoint: `POST https://<your-domain>/api/v1/alerts/<serviceId>`. Signature spec in doc 06 §4: `v1=hex(HMAC_SHA256(secret, "<timestamp>.<rawBody>"))`, timestamp within ±300 s. **Sign the exact bytes you send** (don't re-serialize JSON after signing).

### C1. curl + openssl
```bash
BODY='{"fingerprint":"health:checkout","title":"Checkout failing","severity":"critical","error":{"type":"Error","message":"500 from /api/checkout","frames":[]}}'
TS=$(date +%s)
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$FIREBREAK_ALERT_SECRET" | sed 's/^.* //')
curl -sS -X POST "$FIREBREAK_URL/api/v1/alerts/$FIREBREAK_SERVICE_ID" \
  -H "content-type: application/json" \
  -H "x-firebreak-timestamp: $TS" \
  -H "x-firebreak-signature: v1=$SIG" \
  --data "$BODY"
```

### C2. Node (any backend, a cron, or a GitHub Action)
```ts
import { createHmac } from "node:crypto";
export async function sendFirebreakAlert(payload: object) {
  const body = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac("sha256", process.env.FIREBREAK_ALERT_SECRET!).update(`${ts}.${body}`).digest("hex");
  const res = await fetch(`${process.env.FIREBREAK_URL}/api/v1/alerts/${process.env.FIREBREAK_SERVICE_ID}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-firebreak-timestamp": ts, "x-firebreak-signature": `v1=${sig}` },
    body,
  });
  if (!res.ok) throw new Error(`Firebreak alert failed: ${res.status} ${await res.text()}`);
  return res.json();
}
```
Use a stable `fingerprint` per failure type (e.g. `health:<errorType>:<function>`) so repeats attach to one incident. Send an `id` to make retries idempotent.

### C3. The demo fixture
`pnpm fixture:break` / `fixture:fire` / `fixture:reset` — doc 11.

---

## Part D — Connecting MCP clients

Create a key at `/app/settings/mcp` (permissions: read + propose by default; "Approve rollbacks" only if you really want approvals from chat). Server URL = `NEXT_PUBLIC_MCP_URL` (e.g. `https://firebreak-mcp-xxxx.code.run/mcp`). Auth header: `Authorization: Bearer fbk_…`.

### D1. Claude Code
```bash
claude mcp add --transport http firebreak https://<mcp-host>/mcp --header "Authorization: Bearer fbk_..."
claude mcp list        # firebreak should show as connected
```

### D2. Cursor — `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project)
```json
{
  "mcpServers": {
    "firebreak": {
      "url": "https://<mcp-host>/mcp",
      "headers": { "Authorization": "Bearer fbk_..." }
    }
  }
}
```

### D3. VS Code (Copilot agent mode) — `.vscode/mcp.json`
```json
{
  "servers": {
    "firebreak": { "type": "http", "url": "https://<mcp-host>/mcp", "headers": { "Authorization": "Bearer fbk_..." } }
  }
}
```

### D4. Claude Desktop (bridge via `mcp-remote`, because custom remote connectors there expect OAuth — native OAuth is roadmap R7.1)
`claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "firebreak": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://<mcp-host>/mcp", "--header", "Authorization:${FIREBREAK_AUTH}"],
      "env": { "FIREBREAK_AUTH": "Bearer fbk_..." }
    }
  }
}
```
(The `Authorization:${VAR}` form without a space avoids argument-splitting issues on Windows. Verify against the current `mcp-remote` README.)

### D5. NitroStudio (local development)
Open the `apps/mcp` folder in NitroStudio 1.4.20 with `MCP_TRANSPORT_TYPE=stdio` and `FIREBREAK_MCP_KEY` in `apps/mcp/.env` — doc 05 §9.

### D6. Try it
Ask: "What's on fire?" → "Which commit caused it?" → "Roll it back." → approve via the link → "Did it work?"

---

## Part E — Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Repo missing in the Service wizard | App not installed on that repo/org, or "selected repositories" excludes it | Integrations → Configure on GitHub → add the repo |
| Org install never appears | Waiting for an org owner to approve | Ask an owner to approve the request in org settings |
| `INSTALLATION_CLAIMED` | That installation is linked to another Firebreak workspace | Use that workspace, or uninstall/reinstall the App |
| `INSTALLATION_NOT_ACCESSIBLE` | The GitHub account that authorized can't access that installation | Sign in to GitHub as a member/owner of that org and retry |
| Callback says "reconnect" | "Request user authorization during installation" is off in the App settings, or the callback was opened without `code` | Enable it (doc 12 A2) and start again from Firebreak |
| Vercel token rejected | Expired/revoked token, or full-account token used for a team without Team ID | Create a team-scoped token, or add Team ID |
| Alert returns 401 | Wrong secret, clock skew > 5 min, body changed after signing, header format not `v1=<hex>` | Re-copy secret (rotate if lost), sync clock (NTP), sign exact bytes |
| Alert returns 404 | Wrong service id or service archived | Copy id from the service page |
| Trace failed `vercel_not_connected` / `vercel_unauthorized` | No/invalid Vercel connection | Reconnect Vercel, then **Retry trace** |
| No suspects / "LOW confidence" | Deployments lack `githubCommitSha` (project not Git-connected) or frames are bundled with no hint | Connect the Vercel project to GitHub; include `hint` or source-mapped frames in alerts |
| "No earlier production deployment to roll back to" | Only one production deployment exists, or earlier ones were bad in previous incidents | Deploy a known-good version first; resolve manually |
| Rollback failed `VERCEL_PLAN_LIMIT` | Hobby can only roll back to the immediately previous deployment | Expected on Hobby when the target isn't the previous one; upgrade or fix forward |
| Rollback cancelled (drift) | Someone deployed/rolled back between approval and execution | Re-propose; the new plan uses the new production state |
| Never verifies | Health URL doesn't exercise the broken path, is cached, or returns another SHA | Make the check deep + `no-store`; include `sha` |
| New pushes don't go live after a rollback | Vercel pauses production auto-assignment after any rollback | Promote the fixed deployment in Vercel (or "Undo Rollback"); roadmap R1.1 automates this |
| Incident stuck "Investigating" | Inngest not synced / signing key wrong / Inngest can't reach the app (Deployment Protection on a preview URL) | Check Inngest dashboard → Apps → sync; use the production URL; set keys |
| MCP: `UNAUTHENTICATED` | No/incorrect `Authorization: Bearer fbk_…` header, revoked key (takes ≤ 60 s), using `X-API-Key` | Use the Bearer header; create a new key |
| MCP: `FORBIDDEN … actions:approve` | Key without approve permission | Approve in the web app (intended) or create a key with that permission |
| MCP widgets don't render | Client doesn't support MCP Apps UI, or the image lacks `src/widgets/out` | Tools still return JSON; check the Docker image (doc 05 §12) |
| NitroStudio can't start the server | `@firebreak/core` not built, missing `.env`, or something writes to stdout | `pnpm --filter @firebreak/core build`; fill `.env`; logs to stderr only |
| MCP server unreachable | Host asleep (Koyeb/Cloud Run cold start) or `HOST` not `0.0.0.0` | Use an always-on host; set `HOST=0.0.0.0`; check `/mcp/health` |

---

## Data access summary (put on `/docs/mcp` and in Security FAQ)

| Data | Read from | Stored |
|---|---|---|
| Repo commits + diffs | GitHub (Contents: read) for the commit range of an incident | commit metadata + ≤ 60-line excerpts of matched files (top 5 suspects) |
| Deployments | Vercel API | ids, URLs, SHAs, timestamps on incidents/actions |
| Health responses | your health URL | status, latency, SHA (no bodies beyond 64 KB read, nothing else kept) |
| Tokens/keys | you | encrypted (AES-256-GCM); MCP keys only as SHA-256 hashes |
| AI | sends the evidence bundle (no secrets, scrubbed) to the provider you choose, only when analysing an incident | the structured analysis |
