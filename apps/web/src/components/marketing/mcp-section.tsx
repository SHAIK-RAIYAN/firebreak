"use client";

import { useState } from "react";
import { Copy, Check, Cpu, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CLIENTS = [
  {
    id: "claude",
    name: "Claude Code",
    config: `# Add Firebreak MCP to your Claude Code project
claude mcp add firebreak \\
  --transport sse \\
  --url http://localhost:4000/sse \\
  --header "Authorization: Bearer fbk_your_api_key"`,
  },
  {
    id: "cursor",
    name: "Cursor",
    config: `// Add to .cursor/mcp.json
{
  "mcpServers": {
    "firebreak": {
      "url": "http://localhost:4000/sse",
      "headers": {
        "Authorization": "Bearer fbk_your_api_key"
      }
    }
  }
}`,
  },
  {
    id: "nitrostudio",
    name: "NitroStudio",
    config: `# Connect directly via NitroStudio UI:
1. Open http://localhost:4000 in NitroStudio
2. Add Header: Authorization: Bearer fbk_your_api_key
3. Explore the 9 tools and interactive HTML widgets!`,
  },
];

const TOOLS = [
  { name: "list_incidents", type: "read" },
  { name: "get_incident", type: "read" },
  { name: "get_suspects", type: "read" },
  { name: "get_analysis", type: "read" },
  { name: "get_timeline", type: "read" },
  { name: "list_services", type: "read" },
  { name: "propose_rollback", type: "guard" },
  { name: "get_action_status", type: "read" },
  { name: "approve_action", type: "guard" },
];

export function McpSection() {
  const [activeClient, setActiveClient] = useState(0);
  const [copied, setCopied] = useState(false);

  const copySnippet = () => {
    const text = CLIENTS[activeClient]?.config ?? "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="mcp" className="py-16 lg:py-20 border-t border-[var(--line)] bg-[var(--bg-raised)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 font-mono text-xs text-[var(--accent)] tracking-wider">
            <span>[04]</span>
            <span>WORKS WHERE YOU WORK</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display tracking-tight text-[var(--fg)]">
              Same loop, inside your MCP client.
            </h2>
            <p className="text-[var(--fg-muted)] text-sm sm:text-base max-w-xl">
              Exposes a Model Context Protocol server powered by NitroStack. Ask Claude or Cursor to inspect suspects directly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Terminal Snippet */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="lg:col-span-7 bg-[var(--surface)] border border-[var(--line)] rounded-2xl overflow-hidden shadow-sm font-mono text-xs flex flex-col"
          >
            <div className="bg-[var(--bg)] px-4 py-3 border-b border-[var(--line)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 hidden sm:inline" />
                <div className="flex gap-1.5">
                  {CLIENTS.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveClient(i)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                        activeClient === i
                          ? "bg-[var(--accent)] text-[var(--accent-fg)] font-semibold"
                          : "text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={copySnippet}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all duration-200 border-[var(--line)] hover:border-[var(--line-strong)] bg-[var(--surface)] text-[var(--fg-subtle)] hover:text-[var(--fg)]`}
                title="Copy configuration snippet"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="copied"
                      initial={{ opacity: 0, scale: 0.85, y: -2 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 2 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1.5 font-medium"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0, scale: 0.85, y: -2 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 2 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <pre className="p-4 text-[11px] text-[var(--fg)] overflow-x-auto overflow-y-hidden leading-relaxed bg-[var(--surface)] h-[246px] min-h-[246px] max-h-[246px]">
              {CLIENTS[activeClient]?.config ?? ""}
            </pre>
          </motion.div>

          {/* Right: Tools & Widgets overview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
            className="lg:col-span-5 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <Cpu className="w-4 h-4 text-[var(--accent)]" />
                  <span className="font-semibold text-[var(--fg)]">9 MCP TOOLS</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                {TOOLS.map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--line)] text-[var(--fg-muted)] hover:border-[var(--line-strong)] hover:text-[var(--fg)] transition-colors"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        tool.type === "guard" ? "bg-[var(--danger)]" : "bg-[var(--accent)]"
                      }`}
                    />
                    <span className="text-[11px] font-semibold truncate">{tool.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] mt-3 text-[11px] text-[var(--fg-subtle)] font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>Read Tools</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
                <span>Guarded Mutations</span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

