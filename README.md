# 🔥 Firebreak

> **Stop the spread. Roll back broken production deploys with proof.**

Firebreak is an automated incident diagnosis and verified rollback platform for teams shipping on **GitHub** and **Vercel**, powered by the **NitroStack Model Context Protocol (MCP)** framework.

When a bug crashes production, Firebreak immediately traces the error stack to the exact breaking commit, stages a drift-safe rollback, requires human approval, and verifies recovery with live health probes.

---

## ✨ Key Features

- 🎯 **Deterministic Culprit Ranking**: Analyzes git diffs and error stack frames to identify the exact breaking commit. Zero guessing, zero AI hallucinations.
- 🤖 **AI Root Cause Analysis**: Leverages Google Gemini to explain what broke, why it broke, and how to fix the code.
- 🛡️ **Human-in-the-Loop Safety**: Production rollbacks always require explicit operator approval. Preflight checks prevent rollbacks if production state has drifted.
- ⚡ **Instant Vercel Rollback**: Rolls back production atomically in milliseconds by pointing the production domain to the last known healthy deployment.
- 🩺 **Automated Health Probes**: Verifies recovery with live probes until 3 consecutive HTTP 200 OK responses are confirmed.
- 🧩 **NitroStack MCP Server**: 9 tools and 3 interactive visual widgets that integrate directly with **NitroStudio**, **Claude Code**, **Cursor**, and **ChatGPT**.

---

## 🔄 The 6-Step Incident Lifecycle

```text
[1. DETECT]  ──►  [2. TRACE]  ──►  [3. RANK]  ──►  [4. PROPOSE]  ──►  [5. APPROVE]  ──►  [6. VERIFY]
 Alert Ingest     Git History     Offending Commit   Drift-Safe         Human Operator    3x Live 200 OKs
 HMAC Signed      Vercel Deploys  Isolated (0 AI)   Rollback Staged    Confirms Action   Service Healed
```

1. **Detect**: Ingests alerts via secure HMAC-SHA256 signed webhooks.
2. **Trace**: Matches the failing production deployment against the last healthy deployment.
3. **Rank**: A deterministic algorithm scores commits by stack frame overlaps and code diffs.
4. **Propose**: Stages a rollback proposal targeting the last known good deployment.
5. **Approve**: An operator clicks approve in the Firebreak Console or approves via MCP tool.
6. **Verify**: Confirms production health with automated probes before resolving the incident.

---

## 🛠️ NitroStack MCP Tools & Live Widgets

Firebreak includes a full-featured MCP server with **9 tools** and **3 live interactive widgets**:

| Tool | Category | Live UI Widget | Description |
| :--- | :--- | :--- | :--- |
| `list_services` | Services | — | List all protected repos, health endpoints, and active incident status. |
| `list_incidents` | Incidents | — | List all open and resolved incidents for the workspace. |
| `get_incident` | Incidents | `incident-card` | Live card showing incident status, bad vs. good deploys, and top suspect. |
| `get_suspects` | Incidents | `suspect-list` | Live list ranking culprit commits, confidence scores, and code hunks. |
| `get_analysis` | Incidents | — | AI root cause explanation and recommended code fixes. |
| `get_timeline` | Incidents | — | Chronological audit trail of all alerts, actions, and approvals. |
| `propose_rollback` | Actions | `action-status` | Stages a verified rollback proposal to the last safe deployment. |
| `get_action_status`| Actions | `action-status` | Real-time status of rollback execution and verification probes. |
| `approve_action` | Actions | `action-status` | Approves and executes the rollback on Vercel. Displays live recovery. |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/SHAIK-RAIYAN/firebreak.git
cd firebreak
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure your keys:
- `DATABASE_URL`: Neon Postgres connection string
- `FIREBREAK_MCP_KEY`: Master MCP API key
- `GITHUB_APP_*`: GitHub App credentials
- `VERCEL_*`: Vercel token & project IDs

### 3. Run Locally
```bash
# Run Next.js Web Console & API (Port 3000)
npm run dev

# Run NitroStack MCP Server (Dual STDIO + HTTP on Port 3005)
npm run start:prod
```

---

## 🧪 Live Demo Simulation (The Controlled Fire)

Test the complete incident response pipeline on a real live target (`firebreak-demo` on Vercel):

```bash
# 1. Break production (pushes 3 real commits with a bug to GitHub; waits for 500)
npm run fixture:break

# 2. Fire the signed alert into Firebreak
npm run fixture:fire

# 3. Open Firebreak console or NitroStudio to inspect suspects & approve rollback

# 4. Cleanly reset the demo repo back to healthy
npm run fixture:reset
```

---

## 🔒 Security Principles

- **Human Authorization Required**: Rollbacks never execute without human sign-off.
- **Drift Protection**: Production state is re-verified milliseconds before any change.
- **Zero-Trust Encryption**: All tokens and secrets are encrypted with **AES-256-GCM**.
- **Isolated Telemetry**: Source code diffs are analyzed only on explicit demand.
