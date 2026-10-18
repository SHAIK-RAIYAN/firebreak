# Firebreak

> **Stop the spread. Roll back bad deploys with proof.**

Firebreak is an autonomous incident diagnosis and verified rollback platform for teams shipping on Vercel and GitHub. When bad code reaches production, Firebreak traces the error stack to the exact breaking commit, proposes a safe rollback with drift validation, waits for human operator approval, executes the rollback, and verifies recovery through automated health probes. It exposes this entire workflow through a standardized Model Context Protocol (MCP) server built with **NitroStack**.

---

## System Architecture

```text
                         ┌────────────────────────── MCP clients ──────────────────────────┐
                         │  NitroStudio (local, stdio)   Claude Code / Cursor / Claude (HTTP) │
                         └───────────────┬──────────────────────────────┬──────────────────┘
                                         │ stdio (dev)                  │ Streamable HTTP  POST /mcp
                                         │                              │ Authorization: Bearer fbk_…
                              ┌──────────▼──────────────────────────────▼──────────┐
                              │  apps/mcp  — NitroStack MCP server (long-running)   │
                              │  tools · widgets (ui://widget/*.html) · McpKeyGuard │
                              │  host: Northflank / Docker, 1 instance             │
                              └──────────┬─────────────────────────────┬────────────┘
                                         │ imports                     │ inngest.send()
┌──────────────┐  HTTPS   ┌──────────────▼─────────────────────────────▼────────────┐
│   Browser    ├─────────►│  apps/web — Next.js 16 on Vercel Hobby                   │
│ marketing +  │◄─────────┤  • marketing pages (static, SEO, motion)                  │
│ app (/app/*) │ polling  │  • /api/v1/* REST (session auth)                          │
└──────────────┘          │  • /api/v1/alerts/{svc}  (HMAC)  ◄──── alert fixture CLI  │
                          │  • /api/v1/integrations/github/webhook ◄── GitHub App     │
                          │  • /api/inngest  (workflow functions) ◄──► Inngest Cloud  │
                          └──────────────┬───────────────────────────────────────────┘
                                         │ imports
                          ┌──────────────▼───────────────────────────────────────────┐
                          │  packages/core — ALL business logic (pure TS, tested)     │
                          │  domain (state machines, ranking, preflight) · repo (DB)  │
                          │  adapters (github, vercel, http-probe) · crypto · ai      │
                          │  inngest client + event schemas                            │
                          └───────┬───────────────┬──────────────┬───────────────────┘
                                  │               │              │
                           Neon Postgres     GitHub API     Vercel API      AI providers
                           (neon-http)      (GitHub App)   (user token)     (BYOK/default)
```

---

## The 6-Step Incident Loop

```text
[DETECT] ──► [TRACE] ──► [RANK] ──► [PROPOSE] ──► [APPROVE] ──► [VERIFY]
  Alert        Git Diff     Scoring     Preflight     Human Confirms  3x 200 OK
  HMAC         Timeline     Engine      & Drift Check & Rollback      Live Probes
```

1. **Detect**: Alert intake verifies signed HMAC-SHA256 signatures with timestamp replay protection.
2. **Trace**: Correlates the broken production deployment with the last known healthy deployment via GitHub App Octokit and Vercel APIs.
3. **Rank**: A deterministic scoring engine ranks candidate commits using stack frame overlap, diff patch hunks, risky paths (pricing, migration, auth), and author recency. Zero guessing.
4. **Propose**: Runs preflight validation (target is `READY`, production SHA matches alert, target is within maximum rollback depth).
5. **Approve & Execute**: Requires explicit human authorization (via Web Console or authenticated MCP tool). Swaps Vercel deployment alias atomically.
6. **Verify**: Polls live service health endpoint until 3 consecutive HTTP 200 responses with matching deployment commit SHAs are recorded.

---

## NitroStack Model Context Protocol (MCP) Server

Firebreak provides a dedicated MCP server in `apps/mcp` built with the **NitroStack** framework, exposing 9 standardized tools:

| Tool               | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| `list_incidents`   | List open, investigating, and resolved incidents for the authenticated workspace. |
| `get_incident`     | Retrieve full incident room state, candidate list, and verification metrics.      |
| `rank_suspects`    | Inspect deterministic scoring breakdown, file overlaps, and evidence weights.     |
| `get_diff`         | Fetch per-file patch and unified git diff for a suspect commit.                   |
| `propose_rollback` | Run preflight readiness and drift checks, then stage rollback proposal.           |
| `approve_action`   | Record operator approval and trigger atomic Vercel alias rollback.                |
| `reject_action`    | Reject proposed action with operator reason to dismiss false positive.            |
| `poll_health`      | Query recent automated health probes or trigger an active probe check.            |
| `resolve_incident` | Transition incident to resolved after verified recovery streak.                   |

### Connecting to AI Editors

#### Claude Code CLI:

```bash
claude mcp add firebreak -- npx -y @firebreak/mcp@latest --workspace <WORKSPACE_ID>
```

#### Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "firebreak": {
      "command": "npx",
      "args": ["-y", "@firebreak/mcp@latest", "--workspace", "<WORKSPACE_ID>"],
      "env": {
        "FIREBREAK_MCP_KEY": "fbk_mcp_<id>_<secret>"
      }
    }
  }
}
```

#### Cursor / Windsurf:

- **Type:** Command
- **Command:** `npx -y @firebreak/mcp@latest`
- Or use the HTTP/SSE endpoint: `https://firebreak.dev/api/mcp` with `Authorization: Bearer fbk_mcp_...`

---

## Monorepo Layout

```text
├── apps/
│   ├── web/           # Next.js 16 App Router (Marketing, Console, REST APIs, Inngest)
│   └── mcp/           # NitroStack MCP server (9 tools, HTML widgets, McpKeyGuard)
├── packages/
│   ├── core/          # Business logic, Neon Drizzle schema, crypto, adapters, AI analyst
│   └── fixtures/      # Incident simulation CLI (break, fire, reset)
└── docs/              # 16 detailed architectural, security, and runbook specifications
```

---

## Getting Started

### Prerequisites

- Node.js >= 22 LTS
- npm or pnpm
- Inngest CLI (`npx inngest-cli@latest dev`)

### Setup & Local Development

1. **Clone & install dependencies:**

   ```bash
   git clone https://github.com/SHAIK-RAIYAN/firebreak.git
   cd firebreak
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL` (Neon Postgres pooled URL)
   - `DATABASE_URL_UNPOOLED` (Neon direct URL for migrations)
   - `ENCRYPTION_KEY` (32-byte base64-encoded AES-256 key)
   - `BETTER_AUTH_SECRET` & `BETTER_AUTH_URL`
   - `GITHUB_APP_*` credentials
   - `VERCEL_CLIENT_*` credentials

3. **Run database migrations:**

   ```bash
   npm -w @firebreak/core run db:migrate
   ```

4. **Start local servers:**

   ```bash
   # Terminal 1: Inngest Dev Server
   npx inngest-cli@latest dev -u http://localhost:3000/api/inngest

   # Terminal 2: Next.js Web App
   npm run dev
   ```

5. **Typecheck & Test:**
   ```bash
   npm run typecheck   # 4 packages, strict TypeScript
   npm run test        # 106 Vitest unit tests passing
   ```

---

## Incident Simulation Fixtures

Firebreak includes end-to-end fixtures targeting the dedicated `firebreak-demo` environment:

```bash
# 1. Introduce pricing bug and deploy broken release to Vercel
npm run fixture:break

# 2. Fire signed HMAC alert to trigger Inngest diagnosis pipeline
npm run fixture:fire

# 3. Cleanly reset demo repository to verified healthy state
npm run fixture:reset
```

---

## Operational Runbooks & Scripts

- **Cryptographic Key Rotation (`npm run ops:reencrypt`):**
  Decrypts stored credentials with `ENCRYPTION_KEY_PREVIOUS` and re-encrypts with `ENCRYPTION_KEY` across all tenants.
- **Cancel Stuck Action (`npm run ops:cancel-action <actionId>`):**
  Safely transitions stuck executing actions to `failed`, transitions incident to `mitigation_failed`, and appends an audit event.
- **AI Prompt Regression Suite (`npm run test:ai`):**
  Validates structured output generation and sanitization across candidate LLM providers (Anthropic, OpenAI, Google Gemini, xAI).

---

## Security & Privacy Invariants

- **Human-in-the-Loop:** Production rollback mutations **strictly require explicit human authorization**. No autonomous alias swaps occur.
- **Drift Protection:** Even after human approval, production state is re-validated milliseconds before mutation. If production has drifted, the action aborts safely.
- **Zero-Trust Encryption:** All third-party tokens and HMAC secrets are stored with **AES-256-GCM** using workspace-derived Additional Authenticated Data (AAD) to prevent ciphertext transplant attacks.
- **Telemetry & Isolation:** Multi-tenant workspace data is isolated at the database query layer. Source code diffs are transmitted strictly to the customer's chosen BYOK AI provider only during analysis requests.

---

## License

MIT © 2026 Firebreak Systems.
