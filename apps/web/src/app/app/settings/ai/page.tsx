"use client";

import { useEffect, useState, useCallback } from "react";
import { PROVIDERS, type ProviderId } from "@firebreak/core";
import {
  Cpu,
  Key,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  RefreshCw,
  X,
} from "lucide-react";

interface AiSettingsData {
  mode: "default" | "byok";
  activeProvider: ProviderId | null;
  dailyQuotaRemaining: number;
  dailyQuotaLimit: number;
  credentials: {
    provider: ProviderId;
    model: string | null;
    last4: string;
    status: string;
    validatedAt: string | null;
  }[];
}

export default function AiSettingsPage() {
  const [settings, setSettings] = useState<AiSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMode, setSavingMode] = useState(false);

  // Key dialog state
  const [activeDialogProvider, setActiveDialogProvider] = useState<ProviderId | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [validating, setValidating] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/ai/settings");
      if (!res.ok) throw new Error("Failed to load AI settings");
      const json = await res.json();
      setSettings(json.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSettings();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchSettings]);

  const handleUpdateMode = async (mode: "default" | "byok", provider?: ProviderId) => {
    setSavingMode(true);
    try {
      const res = await fetch("/api/v1/ai/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          provider: provider ?? settings?.activeProvider ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update AI mode");
      await fetchSettings();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingMode(false);
    }
  };

  const handleOpenDialog = (provider: ProviderId) => {
    setActiveDialogProvider(provider);
    setKeyInput("");
    setDialogError(null);
    const existingCred = settings?.credentials.find((c) => c.provider === provider);
    const defaultModel =
      existingCred?.model ||
      PROVIDERS[provider].models.find((m) => "default" in m && m.default)?.id ||
      PROVIDERS[provider].models[0].id;
    setSelectedModel(defaultModel);
  };

  const handleSaveKey = async () => {
    if (!activeDialogProvider) return;
    if (!keyInput.trim()) {
      setDialogError("Please enter an API key");
      return;
    }

    setValidating(true);
    setDialogError(null);
    try {
      const res = await fetch(`/api/v1/ai/keys/${activeDialogProvider}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: keyInput.trim(),
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Key validation failed");
      }

      setActiveDialogProvider(null);
      await fetchSettings();
    } catch (err) {
      setDialogError((err as Error).message);
    } finally {
      setValidating(false);
    }
  };

  const handleDeleteKey = async (provider: ProviderId) => {
    if (!confirm(`Remove the API key for ${PROVIDERS[provider].label}?`)) return;
    try {
      const res = await fetch(`/api/v1/ai/keys/${provider}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove key");
      await fetchSettings();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-[var(--surface)] rounded w-1/4" />
        <div className="h-4 bg-[var(--surface)] rounded w-1/2" />
        <div className="h-64 bg-[var(--surface)] rounded w-full" />
      </div>
    );
  }

  const providerList: ProviderId[] = ["anthropic", "openai", "google", "xai"];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">
          AI Analysis &amp; Keys
        </h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Configure provider API keys for incident root-cause analysis and code fix suggestions
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Mode Segmented Control Card */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--fg)]">
              Analysis Provider Mode
            </h2>
            <p className="text-xs text-[var(--fg-muted)]">
              Choose whether to use Firebreak platform quota or your own API keys (BYOK)
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--line)] rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleUpdateMode("default")}
              disabled={savingMode}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                settings?.mode === "default"
                  ? "bg-[var(--bg-raised)] text-[var(--fg)] shadow-xs"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              Firebreak Default
            </button>
            <button
              type="button"
              onClick={() => handleUpdateMode("byok")}
              disabled={savingMode}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                settings?.mode === "byok"
                  ? "bg-[var(--bg-raised)] text-[var(--fg)] shadow-xs"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              Bring Your Own Key
            </button>
          </div>
        </div>

        {/* Quota line */}
        <div className="flex items-center justify-between text-xs font-mono text-[var(--fg-muted)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span>Platform Quota:</span>
            <span className="font-semibold text-[var(--fg)]">
              {settings?.dailyQuotaRemaining ?? 20} of {settings?.dailyQuotaLimit ?? 20} analyses remaining today
            </span>
          </div>
          <span className="text-[var(--fg-subtle)]">Resets daily at 00:00 UTC</span>
        </div>
      </div>

      {/* 4 Provider Cards (2x2 Grid) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--fg)]">
            Provider Keys
          </h2>
          <span className="text-xs font-mono text-[var(--fg-subtle)]">
            AES-256-GCM encrypted
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providerList.map((provider) => {
            const config = PROVIDERS[provider];
            const cred = settings?.credentials.find((c) => c.provider === provider);
            const isConnected = !!cred && cred.status === "active";
            const isActiveForByok = settings?.mode === "byok" && settings?.activeProvider === provider;

            return (
              <div
                key={provider}
                className={`rounded-xl border p-5 space-y-4 transition flex flex-col justify-between ${
                  isActiveForByok
                    ? "border-[var(--accent)] bg-[var(--surface)]/40 shadow-sm"
                    : "border-[var(--line)] bg-[var(--bg-raised)]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[var(--accent)]" />
                      <span className="font-semibold text-sm text-[var(--fg)]">
                        {config.label}
                      </span>
                    </div>

                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-[var(--ok)] border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Connected</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[var(--fg-subtle)] px-2 py-0.5 rounded bg-[var(--surface)]">
                        Not configured
                      </span>
                    )}
                  </div>

                  {/* Connected Details */}
                  {isConnected ? (
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="text-[var(--fg)] flex items-center justify-between">
                        <span className="text-[var(--fg-subtle)]">Key:</span>
                        <span>••••{cred.last4}</span>
                      </div>
                      <div className="text-[var(--fg)] flex items-center justify-between">
                        <span className="text-[var(--fg-subtle)]">Model:</span>
                        <span className="text-[var(--accent)]">{cred.model || "Default"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--fg-muted)]">
                      Add an API key to use {config.label} models for incident explanation.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
                  {isConnected ? (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs font-mono cursor-pointer">
                          <input
                            type="radio"
                            name="activeProviderRadio"
                            checked={settings?.activeProvider === provider}
                            onChange={() => handleUpdateMode("byok", provider)}
                            className="accent-[var(--accent)]"
                          />
                          <span className="text-[var(--fg-muted)]">Use for BYOK</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDialog(provider)}
                          className="px-2.5 py-1 text-xs font-mono rounded bg-[var(--surface)] hover:bg-[var(--line)] text-[var(--fg)] border border-[var(--line)]"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(provider)}
                          className="p-1 text-[var(--fg-muted)] hover:text-rose-400 transition"
                          title="Remove key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenDialog(provider)}
                      className="w-full py-1.5 px-3 rounded-lg bg-[var(--surface)] hover:bg-[var(--line)] border border-[var(--line)] text-xs font-mono font-medium text-[var(--fg)] transition flex items-center justify-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Add {config.label} Key</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy Callout */}
      <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] flex items-center gap-3 text-xs text-[var(--fg-muted)]">
        <ShieldCheck className="w-5 h-5 text-[var(--accent)] shrink-0" />
        <span>
          Keys are sealed with AES-256-GCM. We never use your prompts, diffs, or code to train models. Provider calls are stateless and run with verified timeouts.
        </span>
      </div>

      {/* Add / Replace Key Modal */}
      {activeDialogProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-[var(--bg-raised)] border border-[var(--line)] rounded-xl shadow-2xl p-6 space-y-5"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 className="text-base font-bold text-[var(--fg)]">
                Connect {PROVIDERS[activeDialogProvider].label}
              </h3>
              <button
                type="button"
                onClick={() => setActiveDialogProvider(null)}
                className="p-1 rounded text-[var(--fg-muted)] hover:text-[var(--fg)]"
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
                <label className="text-xs font-mono font-semibold text-[var(--fg)]">
                  API Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Paste your key here..."
                  autoFocus
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                />
                <p className="text-[11px] text-[var(--fg-subtle)]">
                  The key is validated with a cheap model call before saving.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-[var(--fg)]">
                  Analysis Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                >
                  {PROVIDERS[activeDialogProvider].models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => setActiveDialogProvider(null)}
                className="px-4 py-2 text-xs font-mono rounded-lg text-[var(--fg-muted)] hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={validating}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-solid)] text-[var(--accent-fg)] rounded-lg text-xs font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {validating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{validating ? "Validating key…" : "Validate & Save"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
