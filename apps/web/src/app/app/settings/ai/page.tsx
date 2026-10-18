"use client";

import { useEffect, useState, useCallback } from "react";
import { PROVIDERS, type ProviderId } from "@firebreak/core";
import {
  Cpu,
  Key,
  Trash2,
  ShieldCheck,
  RefreshCw,
  X,
  AlertTriangle,
  LogIn,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AiSettingsData {
  mode: "default" | "byok";
  activeProvider: ProviderId | null;
  quota?: {
    used: number;
    limit: number;
    remaining: number;
  };
  dailyQuotaRemaining?: number;
  dailyQuotaLimit?: number;
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
  const [error, setError] = useState<{ message: string; isAuth?: boolean } | null>(null);
  const [savingMode, setSavingMode] = useState(false);

  // Key dialog state
  const [activeDialogProvider, setActiveDialogProvider] = useState<ProviderId | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [validating, setValidating] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ai/settings");
      if (res.status === 401) {
        setError({
          message: "Your session has expired. Please sign in to manage AI provider keys.",
          isAuth: true,
        });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `Failed to load AI settings (HTTP ${res.status})`);
      }
      const json = await res.json();
      setSettings(json.data);
      setError(null);
    } catch (err) {
      console.error("AI Settings load error:", err);
      setError({ message: (err as Error).message });
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
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || "Failed to update AI mode");
      }
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
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || "Failed to remove key");
      }
      await fetchSettings();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const remaining = settings?.quota?.remaining ?? settings?.dailyQuotaRemaining ?? 20;
  const limit = settings?.quota?.limit ?? settings?.dailyQuotaLimit ?? 20;
  const used = settings?.quota?.used ?? Math.max(0, limit - remaining);
  const quotaPercent = Math.min(100, Math.round((used / limit) * 100));

  const providerList: ProviderId[] = ["anthropic", "openai", "google", "xai"];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-(--fg)">
          AI Analysis &amp; Keys
        </h1>
        <p className="text-sm text-(--fg-muted) mt-1">
          Configure provider API credentials for automated incident root cause analysis and diff verification.
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading && !settings && (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-(--surface) rounded-xl border border-(--line)" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-40 bg-(--surface) rounded-xl border border-(--line)" />
            <div className="h-40 bg-(--surface) rounded-xl border border-(--line)" />
            <div className="h-40 bg-(--surface) rounded-xl border border-(--line)" />
            <div className="h-40 bg-(--surface) rounded-xl border border-(--line)" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-300 text-xs font-mono flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">{error.message}</span>
              {error.isAuth ? (
                <a
                  href="/login?redirect=/app/settings/ai"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => fetchSettings()}
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-(--surface) hover:bg-(--line) text-(--fg) text-xs font-mono transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content when loaded */}
      {settings && (
        <>
          {/* Mode Selector Card */}
          <div className="rounded-xl border border-(--line) bg-(--bg-raised) p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-(--accent)" />
                  <h2 className="text-sm font-semibold text-(--fg)">
                    Analysis Provider Mode
                  </h2>
                </div>
                <p className="text-xs text-(--fg-muted)">
                  Use platform credits or route through your own encrypted provider credentials.
                </p>
              </div>

              <div className="inline-flex items-center p-0.5 bg-(--surface) border border-(--line) rounded-lg">
                <button
                  type="button"
                  onClick={() => handleUpdateMode("default")}
                  disabled={savingMode}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    settings.mode === "default"
                      ? "bg-(--bg-raised) text-(--fg) font-semibold shadow-xs"
                      : "text-(--fg-muted) hover:text-(--fg)"
                  }`}
                >
                  Platform Quota
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateMode("byok")}
                  disabled={savingMode}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    settings.mode === "byok"
                      ? "bg-(--bg-raised) text-(--fg) font-semibold shadow-xs"
                      : "text-(--fg-muted) hover:text-(--fg)"
                  }`}
                >
                  Bring Your Own Key (BYOK)
                </button>
              </div>
            </div>

            {/* Quota Progress Line */}
            <div className="pt-3 border-t border-(--line) space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-(--fg-muted) flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Daily Platform Allowance:
                  <span className="text-(--fg) font-semibold">
                    {remaining} of {limit} analyses remaining
                  </span>
                </span>
                <span className="text-(--fg-subtle) text-[11px]">Resets 00:00 UTC</span>
              </div>
              <div className="w-full h-1.5 bg-(--surface) rounded-full overflow-hidden">
                <div
                  className="h-full bg-(--accent) transition-all duration-300"
                  style={{ width: `${100 - quotaPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Provider Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-(--fg) uppercase tracking-wider font-mono text-[11px]">
                Supported Providers
              </h2>
              <span className="text-[11px] font-mono text-(--fg-subtle) flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                AES-256-GCM Vault
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {providerList.map((provider) => {
                const config = PROVIDERS[provider];
                const cred = settings.credentials.find((c) => c.provider === provider);
                const isConnected = !!cred && cred.status === "active";
                const isSelectedByok = settings.mode === "byok" && settings.activeProvider === provider;

                return (
                  <div
                    key={provider}
                    className={`rounded-xl border p-4.5 transition flex flex-col justify-between gap-4 ${
                      isSelectedByok
                        ? "border-(--accent) bg-(--surface)/30 ring-1 ring-(--accent)/30"
                        : "border-(--line) bg-(--bg-raised) hover:border-(--line-strong)"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-(--surface) border border-(--line) flex items-center justify-center">
                            <Cpu className="w-4 h-4 text-(--accent)" />
                          </div>
                          <div>
                            <span className="font-semibold text-sm text-(--fg) block">
                              {config.label}
                            </span>
                            <span className="text-[10px] font-mono text-(--fg-subtle)">
                              {config.models.length} models available
                            </span>
                          </div>
                        </div>

                        {isConnected ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-(--fg-subtle) px-2 py-0.5 rounded bg-(--surface) border border-(--line)">
                            Not configured
                          </span>
                        )}
                      </div>

                      {/* Key details or minimal description */}
                      {isConnected ? (
                        <div className="rounded-lg bg-(--surface)/60 border border-(--line) p-2.5 space-y-1 font-mono text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-(--fg-subtle)">Active Key</span>
                            <span className="text-(--fg) font-semibold">••••{cred.last4}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-(--fg-subtle)">Selected Model</span>
                            <span className="text-(--accent) truncate max-w-[180px]">
                              {cred.model || config.models[0]?.id}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-(--fg-muted) leading-relaxed">
                          Provide an API key to enable {config.label} incident diagnostics and automated commit scoring.
                        </p>
                      )}
                    </div>

                    {/* Footer actions */}
                    <div className="pt-3 border-t border-(--line) flex items-center justify-between gap-2">
                      {isConnected ? (
                        <>
                          <label className="flex items-center gap-2 text-xs font-mono cursor-pointer select-none">
                            <input
                              type="radio"
                              name="activeProviderRadio"
                              checked={settings.activeProvider === provider}
                              onChange={() => handleUpdateMode("byok", provider)}
                              className="accent-(--accent) w-3.5 h-3.5"
                            />
                            <span className={isSelectedByok ? "text-(--accent) font-semibold" : "text-(--fg-muted)"}>
                              {isSelectedByok ? "Active for BYOK" : "Set Active"}
                            </span>
                          </label>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDialog(provider)}
                              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-(--surface) hover:bg-(--line) text-(--fg) border border-(--line) transition"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKey(provider)}
                              className="p-1.5 text-(--fg-muted) hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Delete API key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDialog(provider)}
                          className="w-full py-1.5 px-3 rounded-lg bg-(--surface) hover:bg-(--line) border border-(--line) text-xs font-mono font-medium text-(--fg) transition flex items-center justify-center gap-1.5"
                        >
                          <Key className="w-3.5 h-3.5 text-(--accent)" />
                          <span>Configure {config.label} Key</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security Note */}
          <div className="p-3.5 rounded-xl border border-(--line) bg-(--bg-raised) flex items-center gap-3 text-xs text-(--fg-muted)">
            <ShieldCheck className="w-4 h-4 text-(--accent) shrink-0" />
            <span>
              All API keys are encrypted at rest with AES-256-GCM. Code diffs and incident summaries are never retained for model training.
            </span>
          </div>
        </>
      )}

      {/* Add / Edit Key Modal */}
      {activeDialogProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-(--bg-raised) border border-(--line) rounded-xl shadow-2xl p-5 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-(--line) pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-(--accent)" />
                <h3 className="text-sm font-semibold text-(--fg)">
                  Configure {PROVIDERS[activeDialogProvider].label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDialogProvider(null)}
                className="p-1 rounded-lg text-(--fg-muted) hover:text-(--fg) hover:bg-(--surface) transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {dialogError && (
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-300 text-xs font-mono flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                <span>{dialogError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-(--fg)">
                  API Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Paste provider API key..."
                  autoFocus
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-(--line) bg-(--surface) text-(--fg) outline-none focus:border-(--accent) transition"
                />
                <p className="text-[11px] text-(--fg-subtle)">
                  Key will be validated against {PROVIDERS[activeDialogProvider].label}&apos;s API prior to saving.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-(--fg)">
                  Default Model
                </label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-full h-9 px-3 bg-(--surface) border-(--line) text-xs font-mono">
                    <SelectValue placeholder="Select model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS[activeDialogProvider].models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label} ({m.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-(--line)">
              <button
                type="button"
                onClick={() => setActiveDialogProvider(null)}
                className="px-3 py-1.5 text-xs font-mono rounded-lg text-(--fg-muted) hover:bg-(--surface) transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={validating}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-(--accent-solid) text-(--accent-fg) rounded-lg text-xs font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {validating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{validating ? "Validating…" : "Save Key"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
