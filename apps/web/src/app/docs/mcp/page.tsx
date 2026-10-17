import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Terminal, Shield, Zap, Layers } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "NitroStack MCP Documentation · Firebreak",
  description:
    "Connect Claude Code, Cursor, and Claude Desktop to Firebreak using the NitroStack Model Context Protocol (MCP) server with 9 standardized tools.",
  alternates: { canonical: "/docs/mcp" },
};

export default function McpDocsPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://firebreak.dev";

  const techArticleLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Firebreak NitroStack MCP Documentation & Integration Guide",
    description:
      "Guide to integrating Firebreak Model Context Protocol (MCP) server built with NitroStack across Cursor, Claude Code, and Claude Desktop.",
    datePublished: "2026-10-17T00:00:00Z",
    author: {
      "@type": "Organization",
      name: "Firebreak",
      url: siteUrl,
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--accent)] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(techArticleLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark className="w-6 h-6" />
              <span className="font-display font-bold text-lg tracking-tight lowercase">firebreak</span>
            </Link>
            <span className="font-mono text-xs text-[var(--fg-subtle)]">/ docs / mcp</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Link>
            <Link
              href="/app"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-solid)] text-[var(--accent-fg)] hover:brightness-110 active:scale-95 transition-all shadow-sm"
            >
              Console
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 flex-1">
        {/* Intro */}
        <div className="space-y-4">
          <div className="font-mono text-xs text-[var(--accent)] tracking-wider">
            [ NITROSTACK MODEL CONTEXT PROTOCOL ]
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-[var(--fg)]">
            Firebreak MCP Server
          </h1>
          <p className="text-base sm:text-lg text-[var(--fg-muted)] max-w-3xl leading-relaxed">
            The Firebreak MCP server is built with the NitroStack framework. It exposes 9 standardized, type-safe tools that allow AI coding agents (Claude Code, Cursor, Windsurf, Claude Desktop) to inspect incidents, view suspect commit diffs, review deterministic scoring, and initiate verified rollbacks under human oversight.
          </p>
        </div>

        {/* 9 Tools Table */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--accent)] tracking-wider">
            <span>[01]</span>
            <span>STANDARDIZED TOOLS</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-[var(--fg)]">
            Available MCP Tools
          </h2>
          <div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--bg-raised)] font-mono text-[var(--fg-muted)]">
                    <th className="p-4">Tool Name</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Parameters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  <tr>
                    <td className="p-4 font-mono font-semibold text-[var(--fg)]">list_incidents</td>
                    <td className="p-4 text-[var(--fg-muted)]">List open and recent incidents for the authenticated workspace.</td>
                    <td className="p-4 font-mono text-[var(--fg-subtle)]">status?, limit?</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-semibold text-[var(--fg)]">get_incident</td>
                    <td className="p-4 text-[var(--fg-muted)]">Retrieve complete incident state, timeline events, and active candidates.</td>
                    <td className="p-4 font-mono text-[var(--fg-subtle)]">incidentId</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-semibold text-[var(--fg)]">rank_suspects</td>
                    <td className="p-4 text-[var(--fg-muted)]">Get deterministic ranking scores, file overlaps, and evidence weights.</td>
                    <td className="p-4 font-mono text-[var(--fg-subtle)]">incidentId</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-semibold text-[var(--fg)]">get_diff</td>
                    <td className="p-4 text-[var(--fg-muted)]">Fetch per-file patches and unified git diff for a suspect commit.</td>
                    <td className="p-4 font-mono text-[var(--fg-subtle)]">incidentId, commitSha</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-semibold text-[var(--fg)]">propose_rollback</td>
                    <td className="p-4 text-[var(--fg-muted)]">Run preflight readiness and drift checks, then stage rollback action.</td>
                    <td className="p-4 font-mono text-[var(--fg-subtle)]">incidentId, targetDeploymentId</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-semibold text-[var(--fg)]">approve_action</td>
                    <td className="p-4 text-[var(--fg-muted)]">Record operator approval and trigger atomic Vercel alias rollback.</td>
                    <td className="p-4 font-mono text-[var(--fg-subtle)]">actionId, reason?</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-semibold text-[var(--fg)]">reject_action</td>
                    <td className="p-4 text-[var(--fg-muted)]">Reject proposed action with operator reason to dismiss false positive.</td>
                    <td className="p-4 font-mono text-[var(--fg-subtle)]">actionId, reason</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-semibold text-[var(--fg)]">poll_health</td>
                    <td className="p-4 text-[var(--fg-muted)]">Trigger live health check probe or retrieve recent probe streak.</td>
                    <td className="p-4 font-mono text-[var(--fg-subtle)]">serviceId</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-semibold text-[var(--fg)]">resolve_incident</td>
                    <td className="p-4 text-[var(--fg-muted)]">Transition incident to resolved status after verified recovery streak.</td>
                    <td className="p-4 font-mono text-[var(--fg-subtle)]">incidentId, note?</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Client Setup Guide */}
        <section className="space-y-8">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--accent)] tracking-wider">
            <span>[02]</span>
            <span>CLIENT CONFIGURATION</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-[var(--fg)]">
            Connecting Your AI Editor
          </h2>

          {/* Claude Code */}
          <div className="p-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] space-y-3">
            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--fg)]">
              <Terminal className="w-4 h-4 text-[var(--accent)]" />
              <span>Claude Code CLI</span>
            </div>
            <p className="text-xs text-[var(--fg-muted)]">
              Run this single command in your terminal to register Firebreak with your Claude Code environment:
            </p>
            <pre className="p-4 rounded-lg bg-[var(--bg-raised)] font-mono text-xs text-[var(--fg)] overflow-x-auto border border-[var(--line)]">
              claude mcp add firebreak -- npx -y @firebreak/mcp@latest --workspace &lt;WORKSPACE_ID&gt;
            </pre>
          </div>

          {/* Claude Desktop */}
          <div className="p-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] space-y-3">
            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--fg)]">
              <Layers className="w-4 h-4 text-[var(--accent)]" />
              <span>Claude Desktop</span>
            </div>
            <p className="text-xs text-[var(--fg-muted)]">
              Add Firebreak to your <code className="font-mono text-[var(--accent)]">claude_desktop_config.json</code>:
            </p>
            <pre className="p-4 rounded-lg bg-[var(--bg-raised)] font-mono text-xs text-[var(--fg)] overflow-x-auto border border-[var(--line)]">
{`{
  "mcpServers": {
    "firebreak": {
      "command": "npx",
      "args": ["-y", "@firebreak/mcp@latest", "--workspace", "<WORKSPACE_ID>"],
      "env": {
        "FIREBREAK_MCP_KEY": "fbk_mcp_<id>_<secret>"
      }
    }
  }
}`}
            </pre>
          </div>

          {/* Cursor */}
          <div className="p-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] space-y-3">
            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--fg)]">
              <Zap className="w-4 h-4 text-[var(--accent)]" />
              <span>Cursor / Windsurf (SSE / HTTP)</span>
            </div>
            <p className="text-xs text-[var(--fg-muted)]">
              Under Cursor Settings → Features → MCP:
            </p>
            <ul className="text-xs text-[var(--fg-muted)] space-y-1 list-disc list-inside">
              <li>Type: <code className="font-mono text-[var(--fg)]">Command</code></li>
              <li>Command: <code className="font-mono text-[var(--fg)]">npx -y @firebreak/mcp@latest</code></li>
              <li>Or use SSE/HTTP endpoint: <code className="font-mono text-[var(--fg)]">{siteUrl}/api/mcp</code> with Bearer token authentication.</li>
            </ul>
          </div>
        </section>

        {/* Security & Authentication */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--accent)] tracking-wider">
            <span>[03]</span>
            <span>SECURITY ARCHITECTURE</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-[var(--fg)]">
            NitroStack McpKeyGuard
          </h2>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed">
            Every MCP request is strictly verified by the <code className="font-mono text-[var(--fg)]">McpKeyGuard</code>. Keys use the secure format <code className="font-mono text-[var(--fg)]">fbk_mcp_&lt;id&gt;_&lt;secret&gt;</code>, stored as SHA-256 hashes in the database. Workspace tenancy is isolated at the database query level, preventing cross-tenant leakage. Human operator confirmation is enforced on rollback triggers.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] py-8 text-center text-xs font-mono text-[var(--fg-subtle)]">
        Firebreak Technical Documentation · Built with NitroStack
      </footer>
    </div>
  );
}
