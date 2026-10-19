# Firebreak MCP Server (Built with NitroStack)

Autonomous incident triage, deterministic commit ranking, and verified rollback server for SREs, developers, and AI agents.

Built using the official **NitroStack TypeScript SDK** (`@nitrostack/core` and `@nitrostack/cli`) with interactive React UI widgets.

---

## Features

- **9 Production-Grade MCP Tools**: Fully typed with Zod, decorated with `@Tool`, guarded by `McpKeyGuard`, and protected by `@RateLimit`.
- **3 Interactive Next.js Widgets**: Rich visual previews (`incident-card`, `suspect-list`, `action-status`) rendered directly in NitroStack Studio and modern MCP clients.
- **Dual Transport**: Supports local **STDIO** (for NitroStudio local dev, Claude Desktop, Cursor) and **Streamable HTTP SSE** (for NitroCloud, ChatGPT, and remote clients).
- **Multi-Tenant Security**: Scoped API keys (`fbk_mcp_...`), workspace isolation, and permission-based scopes (`incidents:read`, `actions:propose`, `actions:approve`).

---

## 9 Standardized MCP Tools

| Tool | Category | Widget | Description |
| :--- | :--- | :--- | :--- |
| `list_services` | Services | — | List protected services (GitHub repository + Vercel project + health URL) and their active incident status. |
| `list_incidents` | Incidents | — | List all open and active production incidents for the authenticated workspace. |
| `get_incident` | Incidents | `incident-card` | Retrieve full incident details, comparing the bad deployment vs. last known healthy deployment with top suspect summary. |
| `get_suspects` | Incidents | `suspect-list` | Inspect deterministic scoring breakdown, file overlaps, and evidence weights pointing to the culprit commit. |
| `get_analysis` | Incidents | — | Retrieve AI incident diagnosis, root cause summary, and remediation suggestions. |
| `get_timeline` | Incidents | — | Chronological audit trail of all alerts, ranking events, action proposals, approvals, and health probe verifications. |
| `propose_rollback` | Actions | `action-status` | Run preflight safety and drift checks, then stage a verified rollback proposal to the last known healthy deployment. |
| `get_action_status`| Actions | `action-status` | Follow real-time rollback execution status, atomic Vercel deployment alias swap, and 3x consecutive health probe recovery. |
| `approve_action` | Actions | `action-status` | Record human operator approval and trigger immediate production rollback. Requires `actions:approve` scope. |

---

## Interactive Widgets

Firebreak compiles React widgets via Next.js static export into `src/widgets/out/` for instant rendering in NitroStack Studio and ChatGPT:

1. **`incident-card`**: Real-time status badge, active blast radius, bad vs. good deployment commit comparison, and quick-action rollback triggers.
2. **`suspect-list`**: Ranked culprit commits with confidence scores, commit author avatars, changed files, and matched stack frame evidence hunks.
3. **`action-status`**: Step-by-step state machine visualizer (`awaiting_approval` ➔ `executing` ➔ `verifying` ➔ `verified`), showing live HTTP 200 health probe recovery streaks.

---

## Quick Start & Local Development

### 1. Prerequisites
- Node.js >= 20.x
- NitroStack CLI (`npm install -g @nitrostack/cli` or via `npx`)
- NitroStack Studio Desktop ([Download](https://nitrostack.ai/studio))

### 2. Install & Build
```bash
# From workspace root
npm install
npm -w @firebreak/mcp run build
```

### 3. Run Locally (Dev Server + Widgets)
```bash
cd apps/mcp
npm run dev
# MCP server starts on port 3005 (or stdio)
# Widget dev server starts on port 3001
```

---

## Connecting in NitroStack Studio

### Option A: Local STDIO (Recommended for local testing)
1. Launch **NitroStudio**.
2. Click **Add Server** ➔ **Nitro Project** tab.
3. Browse to `apps/mcp` and click **Open Project** ➔ **Studio App Canvas**.
4. Studio will detect `@nitrostack/core` and launch the project with `npx tsx src/index.ts`.
5. Navigate to **Tools** in the sidebar to execute any of the 9 tools and preview the interactive widgets.

### Option B: HTTP (Streamable HTTP)
1. Start the server in production mode: `npm run start:prod` (or point to NitroCloud).
2. In NitroStudio, click **Add Server** ➔ **Other Project** tab.
3. **Connection Type**: Select `HTTP (Streamable HTTP)`.
4. **URL**: `http://localhost:3005/mcp` (or your NitroCloud URL `https://<your-app>.nitrocloud.ai/mcp`).
5. **Authentication**: Select `Bearer Token` and provide your Firebreak MCP key (`fbk_mcp_...` generated from `/app/settings/mcp`).
6. Click **Add Server**.

---

## Deployment to NitroStack Cloud

### Method 1: Deploy from NitroStudio
1. Open the project in **NitroStudio**.
2. In the App Canvas header, click **Link to app...** ➔ **Create Cloud App**.
3. Name your app `firebreak`.
4. Click **Deploy**. NitroStudio will bundle the widgets, compile TypeScript, and stream deployment logs until the service turns **Live**.

### Method 2: Deploy from NitroCloud via GitHub
1. Log into [NitroCloud](https://nitrocloud.ai).
2. Click **Create Nitrostack App** ➔ Name: `firebreak`.
3. Go to **Deployments** ➔ **Connect Repository** ➔ Select `SHAIK-RAIYAN/firebreak`.
4. Set branch: `main`.
5. Configure environment variables in NitroCloud Settings:
   - `DATABASE_URL`: Neon PostgreSQL connection string
   - `ENCRYPTION_KEY`: 32-byte AES key
   - `GITHUB_APP_ID`: Your GitHub App ID
   - `GITHUB_APP_PRIVATE_KEY_BASE64`: GitHub App private key
   - `VERCEL_BEARER_TOKEN`: Vercel automation token
   - `APP_URL`: `https://firebreak-pi.vercel.app`
6. Click **Deploy from GitHub**. Once live, copy your service URL (`https://<app>.nitrocloud.ai/mcp`).

---

## Connect to ChatGPT

1. Copy your live MCP SSE URL: `https://<your-app>.nitrocloud.ai/sse`.
2. In ChatGPT, open **Settings** ➔ **Plugins (Apps)** ➔ Enable **Developer mode**.
3. Open the plugins menu ➔ Click `+` (Add plugin).
4. Enter your Server URL (`https://<your-app>.nitrocloud.ai/sse`) and select **No Auth** or **OAuth/Bearer Token**.
5. Click **Connect** to load Firebreak's tools directly into ChatGPT conversations.
