export const dynamic = "force-static";

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://firebreak.dev";

  const content = `# Firebreak — Full Technical Specification & Knowledge Base

> Firebreak is an autonomous incident diagnosis and verified rollback platform for teams shipping on Vercel and GitHub. It combines deterministic stack trace correlation with preflight safety checks, strict human-in-the-loop approval, and automated probe verification. It provides a standardized Model Context Protocol (MCP) server built with NitroStack.

---

## 1. Core Architecture & Operating Principles

1. **Deterministic Over Heuristic**: Commit ranking uses deterministic criteria (stack frame matching, patch hunk boundaries, risky domain patterns, recency) rather than LLM guesswork. Identical inputs yield identical scores.
2. **Human-in-the-Loop Safeguard**: Firebreak NEVER executes a production rollback without explicit human approval. Even with approval, preflight checks verify production hasn't drifted before the alias mutation occurs.
3. **Receipts & Verification**: Rollback is not complete upon alias assignment. Firebreak monitors live health probes until a streak of consecutive 200 OK responses with matching deployment SHAs is recorded.
4. **Zero Shared Secrets**: Third-party credentials (GitHub App installations, Vercel OAuth tokens, AI provider keys) are encrypted with AES-256-GCM using workspace-derived Additional Authenticated Data (AAD).

---

## 2. The 6-Step Incident Loop

1. **Detect**: Alert ingestion endpoint validates incoming webhooks using signed HMAC-SHA256 signatures with replay attack protection (timestamp skew window).
2. **Trace**: Queries the Vercel deployment timeline and GitHub commit log to extract candidates between the last known healthy deployment and the current broken release.
3. **Rank**: Evaluates each candidate commit using file path overlap with error stack traces, function symbol matches, line churn, risky paths (database migrations, billing, pricing, auth), and author recency.
4. **Propose**: Validates the candidate rollback target deployment against Vercel API (is it READY, does production still match the broken commit, is it within max rollback depth).
5. **Approve & Execute**: Human operator confirms action via web console or authenticated MCP command. Firebreak executes atomic production alias reassignment.
6. **Verify**: Runs active probes against service health endpoint. Confirms 3 consecutive HTTP 200 OK responses matching target commit SHA before marking incident resolved.

---

## 3. NitroStack Model Context Protocol (MCP) Server

Firebreak provides a NitroStack MCP server exposing 9 standardized tools:

### Available Tools:
1. \`list_incidents\`: List open, investigating, and resolved incidents for the authenticated workspace.
2. \`get_incident\`: Retrieve full incident room status, timeline events, and active candidates.
3. \`rank_suspects\`: Inspect deterministic scoring breakdown, evidence weights, and diff files.
4. \`get_diff\`: Fetch unified diff patch for a specific commit or candidate deployment.
5. \`propose_rollback\`: Run preflight checks and create an actionable rollback proposal.
6. \`approve_action\`: Record operator approval and trigger rollback execution.
7. \`reject_action\`: Reject a proposed action with operator reason.
8. \`poll_health\`: Query recent automated health probes or trigger manual check.
9. \`resolve_incident\`: Transition incident to resolved after verification.

### Authentication & Guard:
Clients authenticate with bearer tokens format \`fbk_mcp_<id>_<secret>\`. Tokens are hashed with SHA-256 and workspace scoped.

---

## 4. MCP Client Configuration

### Claude Desktop (\`claude_desktop_config.json\`):
\`\`\`json
{
  "mcpServers": {
    "firebreak": {
      "command": "npx",
      "args": ["-y", "@firebreak/mcp@latest", "--workspace", "<WORKSPACE_ID>"],
      "env": {
        "FIREBREAK_MCP_KEY": "fbk_mcp_..."
      }
    }
  }
}
\`\`\`

### Cursor MCP Configuration:
- Name: Firebreak
- Type: Command or SSE/HTTP
- URL: \`${site}/api/mcp\`
- Headers: \`Authorization: Bearer fbk_mcp_...\`

---

## 5. Frequently Asked Questions

Q: Does Firebreak mutate production without human review?
A: No. Every action must be approved by an authorized team member.

Q: What permissions are required?
A: GitHub App with Read Repository access; Vercel integration with deployment alias permissions.

Q: How is AI utilized?
A: AI provides explanatory diff summaries and suggested code fixes for human review. AI never authorizes or executes rollbacks.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
