"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PlusCircle,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Server,
  Terminal,
  ShieldCheck,
  X,
} from "lucide-react";

interface McpKeyItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export default function McpSettingsPage() {
  const queryClient = useQueryClient();
  const {
    data: keys = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<McpKeyItem[]>({
    queryKey: ["mcp-keys"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mcp-keys");
      if (!res.ok) throw new Error("Failed to load MCP API keys");
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 30_000,
  });

  const error = queryError ? (queryError as Error).message : null;

  // Create key dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [scopes, setScopes] = useState<string[]>([
    "incidents:read",
    "actions:propose",
  ]);
  const [creating, setCreating] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Show-once raw key modal
  const [showOnceKey, setShowOnceKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Snippets tab
  const [snippetTab, setSnippetTab] = useState<"claude" | "cursor" | "studio">("claude");

  const mcpUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_MCP_URL || `${window.location.origin}/api/mcp`
      : "http://localhost:3000/api/mcp";

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setDialogError("Please enter a name for the key");
      return;
    }

    setCreating(true);
    setDialogError(null);

    try {
      const res = await fetch("/api/v1/mcp-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create MCP key");
      }

      setOpenCreate(false);
      setNewKeyName("");
      setShowOnceKey(json.data.key);
      queryClient.invalidateQueries({ queryKey: ["mcp-keys"] });
    } catch (err) {
      setDialogError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`Revoke the key "${name}"? Any agent using it will lose access.`)) return;
    try {
      const res = await fetch(`/api/v1/mcp-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
      queryClient.invalidateQueries({ queryKey: ["mcp-keys"] });
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 1500);
  };

  const keyPlaceholder = showOnceKey || "<YOUR_FIREBREAK_MCP_KEY>";

  const claudeSnippet = `// Add to claude_desktop_config.json
{
  "mcpServers": {
    "firebreak": {
      "command": "npx",
      "args": ["-y", "@firebreak/mcp", "--url", "${mcpUrl}"],
      "env": {
        "FIREBREAK_API_KEY": "${keyPlaceholder}"
      }
    }
  }
}`;

  const cursorSnippet = `// Add to Cursor Features > MCP Servers
Name: firebreak
Type: command
Command: npx -y @firebreak/mcp --url ${mcpUrl}
Environment: FIREBREAK_API_KEY=${keyPlaceholder}`;

  const studioSnippet = `// Connect in NitroStudio
Server URL: ${mcpUrl}
Header: Authorization: Bearer ${keyPlaceholder}`;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-(--surface) rounded w-1/4" />
        <div className="h-4 bg-(--surface) rounded w-1/2" />
        <div className="h-64 bg-(--surface) rounded w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-(--fg)">
            NitroStack MCP Server
          </h1>
          <p className="text-sm text-(--fg-muted)">
            Connect AI coding agents (Claude Code, Cursor, NitroStudio) directly to production incidents
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpenCreate(true);
            setDialogError(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-(--accent-solid) text-(--accent-fg) rounded-lg text-xs font-semibold hover:brightness-110 transition shadow-xs self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create MCP Key</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Top MCP Server URL Card */}
      <div className="rounded-xl border border-(--line) bg-(--bg-raised) p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-(--accent)" />
            <span className="font-semibold text-sm text-(--fg)">
              MCP Server Endpoint
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-(--ok) border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-(--ok)" />
            <span>Ready</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 p-2.5 rounded-lg bg-(--surface) border border-(--line) font-mono text-xs text-(--fg) select-all truncate">
            {mcpUrl}
          </code>
          <button
            type="button"
            onClick={() => copyToClipboard(mcpUrl, setCopiedUrl)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-(--surface) border border-(--line) text-xs font-mono text-(--fg) hover:bg-(--line) transition"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-(--ok)" />
                <span className="text-(--ok)">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Keys Table */}
      <div className="rounded-xl border border-(--line) bg-(--bg-raised) p-6 space-y-4">
        <div className="border-b border-(--line) pb-3">
          <h2 className="text-base font-bold text-(--fg)">Active API Keys</h2>
          <p className="text-xs text-(--fg-muted)">
            Scoped credentials for MCP clients to triage and propose mitigations
          </p>
        </div>

        {keys.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-(--fg-muted) border border-dashed border-(--line) rounded-lg">
            No active MCP keys. Create one to connect your IDE or terminal assistant.
          </div>
        ) : (
          <div className="divide-y divide-(--line)">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-(--fg)">
                      {k.name}
                    </span>
                    <span className="font-mono text-xs text-(--fg-subtle)">
                      ({k.prefix}••••)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {k.scopes.map((s) => (
                      <span
                        key={s}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          s === "actions:approve"
                            ? "bg-amber-500/10 border-amber-500/30 text-(--warn)"
                            : "bg-(--surface) border-(--line) text-(--fg-muted)"
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-(--fg-muted) self-end sm:self-center">
                  <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => handleRevokeKey(k.id, k.name)}
                    className="p-1.5 rounded hover:bg-rose-950/20 text-(--fg-muted) hover:text-rose-400 transition"
                    title="Revoke key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect a Client Code Snippets */}
      <div className="rounded-xl border border-(--line) bg-(--bg-raised) p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-(--line) pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-(--accent)" />
            <h2 className="text-base font-bold text-(--fg)">
              Connect a Client
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-(--surface) p-1 rounded-lg border border-(--line)">
            {[
              { id: "claude", label: "Claude Code" },
              { id: "cursor", label: "Cursor" },
              { id: "studio", label: "NitroStudio" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSnippetTab(tab.id as "claude" | "cursor" | "studio")}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition ${
                  snippetTab === tab.id
                    ? "bg-(--bg-raised) text-(--fg) shadow-xs"
                    : "text-(--fg-muted) hover:text-(--fg)"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <pre className="p-4 rounded-lg bg-(--bg) border border-(--line) font-mono text-xs text-(--fg-muted) overflow-x-auto leading-relaxed">
            {snippetTab === "claude" && claudeSnippet}
            {snippetTab === "cursor" && cursorSnippet}
            {snippetTab === "studio" && studioSnippet}
          </pre>
          <button
            type="button"
            onClick={() => {
              const snippet =
                snippetTab === "claude"
                  ? claudeSnippet
                  : snippetTab === "cursor"
                  ? cursorSnippet
                  : studioSnippet;
              copyToClipboard(snippet, setCopiedKey);
            }}
            className="absolute top-3 right-3 px-2.5 py-1 rounded bg-(--surface) border border-(--line) text-[11px] font-mono text-(--fg) hover:bg-(--line) transition flex items-center gap-1"
          >
            {copiedKey ? (
              <span className="text-(--ok)">Copied!</span>
            ) : (
              <span>Copy snippet</span>
            )}
          </button>
        </div>
      </div>

      {/* Create Key Modal */}
      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-(--bg-raised) border border-(--line) rounded-xl shadow-2xl p-6 space-y-5"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-(--line) pb-3">
              <h3 className="text-base font-bold text-(--fg)">
                Create NitroStack MCP Key
              </h3>
              <button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="p-1 rounded text-(--fg-muted) hover:text-(--fg)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {dialogError && (
              <div className="p-3 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300 text-xs font-mono">
                {dialogError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-(--fg)">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. laptop-claude-code"
                  autoFocus
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-(--line) bg-(--surface) text-(--fg) outline-none focus:border-(--accent)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-semibold text-(--fg)">
                  Permissions &amp; Scopes
                </label>
                <div className="space-y-2 p-3 rounded-lg bg-(--surface) border border-(--line) text-xs font-mono">
                  <label className="flex items-center gap-2 text-(--fg)">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled={true}
                      className="accent-(--accent)"
                    />
                    <span>incidents:read (Always included)</span>
                  </label>

                  <label className="flex items-center gap-2 text-(--fg) cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopes.includes("actions:propose")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setScopes([...scopes, "actions:propose"]);
                        } else {
                          setScopes(scopes.filter((s) => s !== "actions:propose"));
                        }
                      }}
                      className="accent-(--accent)"
                    />
                    <span>actions:propose (Allow proposing rollbacks)</span>
                  </label>

                  <label className="flex items-center gap-2 text-(--fg) cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopes.includes("actions:approve")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setScopes([...scopes, "actions:approve"]);
                        } else {
                          setScopes(scopes.filter((s) => s !== "actions:approve"));
                        }
                      }}
                      className="accent-(--warn)"
                    />
                    <span className="text-(--warn) font-semibold">
                      actions:approve (Allow executing rollbacks)
                    </span>
                  </label>

                  {scopes.includes("actions:approve") && (
                    <div className="mt-2 p-2 rounded bg-amber-950/20 border border-amber-900/30 text-[11px] text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Anyone with this key can roll back production directly through an MCP client.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-(--line)">
              <button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="px-4 py-2 text-xs font-mono rounded-lg text-(--fg-muted) hover:bg-(--surface)"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateKey}
                disabled={creating}
                className="px-4 py-2 bg-(--accent-solid) text-(--accent-fg) rounded-lg text-xs font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show-Once Raw Key Modal */}
      {showOnceKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-(--bg-raised) border border-(--ok)/50 rounded-xl shadow-2xl p-6 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-2 text-(--ok)">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-base font-bold text-(--fg)">
                Key Created Successfully
              </h3>
            </div>

            <p className="text-xs text-(--fg-muted)">
              Copy this key now. For your security, <strong className="text-(--fg)">it will never be displayed again</strong>.
            </p>

            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded-lg bg-(--surface) border border-(--line) font-mono text-xs text-(--accent) select-all break-all">
                {showOnceKey}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(showOnceKey, setCopiedKey)}
                className="px-3 py-3 rounded-lg bg-(--accent-solid) text-(--accent-fg) text-xs font-mono font-semibold hover:brightness-110 transition shrink-0"
              >
                {copiedKey ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="pt-3 border-t border-(--line) flex justify-end">
              <button
                type="button"
                onClick={() => setShowOnceKey(null)}
                className="px-4 py-2 bg-(--surface) hover:bg-(--line) border border-(--line) text-xs font-mono rounded-lg text-(--fg) transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
