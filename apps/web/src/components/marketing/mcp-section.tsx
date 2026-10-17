"use client";

import { useState } from "react";
import { Terminal, Copy, Check, Cpu, Sparkles } from "lucide-react";
import { motion } from "motion/react";

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
  "list_incidents",
  "get_incident",
  "get_suspects",
  "get_analysis",
  "get_timeline",
  "propose_rollback",
  "get_action_status",
  "approve_action",
  "list_services",
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
    <section id="mcp" className="py-24 border-t border-[var(--line)] bg-[var(--bg-raised)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-4 font-mono text-xs text-[var(--accent)] tracking-wider"
        >
          <span>[04]</span>
          <span>WORKS WHERE YOU WORK</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--fg)] mb-4"
        >
          Same loop, inside your MCP client.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="text-[var(--fg-muted)] max-w-2xl text-base sm:text-lg mb-12"
        >
          Firebreak exposes a full Model Context Protocol server powered by NitroStack. Ask your coding assistant to inspect suspect commits or approve rollbacks directly.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Terminal Snippet */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-7 bg-[var(--surface)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xl font-mono text-xs"
          >
            <div className="bg-[var(--bg)] px-4 py-3 border-b border-[var(--line)] flex items-center justify-between">
              <div className="flex gap-2">
                {CLIENTS.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveClient(i)}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      activeClient === i
                        ? "bg-[var(--accent)] text-[var(--accent-fg)] font-semibold"
                        : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <button
                onClick={copySnippet}
                className="text-[var(--fg-subtle)] hover:text-[var(--fg)] flex items-center gap-1.5 text-[11px]"
                title="Copy configuration snippet"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[var(--ok)]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="p-4 text-[11px] text-[var(--fg)] overflow-x-auto leading-relaxed bg-[var(--surface)]">
              {CLIENTS[activeClient]?.config ?? ""}
            </pre>
          </motion.div>

          {/* Right: Tools & Widgets overview */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="lg:col-span-5 bg-[var(--surface)] border border-[var(--line)] rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--line)] mb-4 font-mono text-xs">
              <Cpu className="w-4 h-4 text-[var(--accent)]" />
              <span className="font-semibold text-[var(--fg)]">9 STANDARDIZED MCP TOOLS</span>
            </div>

            <div className="grid grid-cols-1 gap-2 font-mono text-xs">
              {TOOLS.map((tool) => (
                <div
                  key={tool}
                  className="flex items-center gap-2 p-1.5 px-2.5 rounded bg-[var(--bg-raised)] border border-[var(--line)] text-[var(--fg-muted)] hover:border-[var(--line-strong)] hover:text-[var(--fg)] transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  <span className="text-[var(--fg)] font-semibold">{tool}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--line)] flex items-center justify-between text-[11px] font-mono text-[var(--fg-subtle)]">
              <span>NitroStudio &amp; Docker compatible</span>
              <span className="text-[var(--accent)] font-semibold">Built with NitroStack</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
