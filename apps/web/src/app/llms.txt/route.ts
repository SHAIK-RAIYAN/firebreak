export const dynamic = "force-static";

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://firebreak.dev";

  const content = `# Firebreak

> Firebreak is an incident-response tool for teams shipping on Vercel and GitHub. It ranks the commits that likely broke production with deterministic evidence, proposes a rollback with preflight checks, executes it only after human approval, and verifies recovery with health checks. It exposes the same workflow through an MCP server built with NitroStack.

## Product
- [How it works](${site}/#loop): Detect, trace, propose, approve, execute, verify.
- [Security](${site}/#security): Approval gates, drift checks, AES-256-GCM key storage, audit timeline.

## MCP
- [Connect an MCP client](${site}/docs/mcp): Claude Code, Cursor, Claude Desktop, NitroStudio setup and the 9 tools.

## Legal & Policies
- [Privacy](${site}/privacy)
- [Terms](${site}/terms)
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
