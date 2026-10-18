"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface IntegrationState {
  github: {
    installations: Array<{
      id: string;
      githubInstallationId: number;
      accountLogin: string;
      accountType: string;
      repositorySelection: string;
      suspended: boolean;
    }>;
  };
  vercel: {
    connected: boolean;
    accountLabel: string | null;
    teamSlug: string | null;
    last4: string | null;
    status: string | null;
  };
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-(--fg-muted)">Loading integrations...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");
  const queryClient = useQueryClient();

  const {
    data: state,
    isLoading: loading,
    error: queryError,
  } = useQuery<IntegrationState>({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await fetch("/api/v1/integrations");
      if (!res.ok) throw new Error("Failed to load integrations");
      const json = await res.json();
      return json.data;
    },
    staleTime: 30_000,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(errorParam || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(
    connectedParam === "github" ? "GitHub connected successfully" : null,
  );

  // Vercel Form State
  const [vercelToken, setVercelToken] = useState("");
  const [vercelTeamId, setVercelTeamId] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleConnectVercel(e: React.FormEvent) {
    e.preventDefault();
    if (!vercelToken.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/integrations/vercel", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token: vercelToken.trim(),
            teamId: vercelTeamId.trim() || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to connect Vercel");
        }

        setVercelToken("");
        setVercelTeamId("");
        setSuccessMsg(`Vercel connected as ${json.data.accountLabel}`);
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
      } catch (err) {
        setErrorMsg((err as Error).message);
      }
    });
  }

  async function handleDisconnectVercel() {
    if (!confirm("Are you sure you want to disconnect Vercel? Active services will lose rollback capability.")) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/integrations/vercel", {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to disconnect Vercel");
        setSuccessMsg("Vercel disconnected");
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
      } catch (err) {
        setErrorMsg((err as Error).message);
      }
    });
  }

  const activeError = errorMsg || (queryError ? (queryError as Error).message : null);

  return (
    <div className="min-h-screen bg-(--bg) text-(--fg) p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-(--line) pb-4">
          <div>
            <div className="flex items-center space-x-2 text-sm text-(--fg-muted) mb-1">
              <Link href="/app" className="hover:text-(--fg)">
                Console
              </Link>
              <span>/</span>
              <span>Integrations</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Connected Integrations</h1>
          </div>
          <Link
            href="/app/services/new"
            className="px-4 py-2 bg-(--accent-solid) text-(--accent-fg) rounded-md font-medium text-sm hover:opacity-90 transition"
          >
            Create Service &rarr;
          </Link>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-4 bg-(--ok)/10 border border-(--ok)/30 rounded-lg text-sm text-(--ok)">
            {successMsg}
          </div>
        )}
        {activeError && (
          <div className="p-4 bg-(--danger)/10 border border-(--danger)/30 rounded-lg text-sm text-(--danger)">
            Error: {activeError}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-(--fg-muted)">Loading integrations...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GitHub Card */}
            <div className="p-6 bg-(--bg-raised) border border-(--line) rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">GitHub</h2>
                  <p className="text-sm text-(--fg-muted)">Repository access and commit comparisons</p>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    state?.github.installations.length
                      ? "bg-(--ok)/20 text-(--ok)"
                      : "bg-(--warn)/20 text-(--warn)"
                  }`}
                >
                  {state?.github.installations.length ? "Connected" : "Not connected"}
                </span>
              </div>

              {state?.github.installations && state.github.installations.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="text-sm font-medium text-(--fg-muted)">Installed accounts:</div>
                  {state.github.installations.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between p-3 bg-(--surface) border border-(--line) rounded-lg text-sm"
                    >
                      <div>
                        <div className="font-semibold">{inst.accountLogin}</div>
                        <div className="text-xs text-(--fg-muted)">
                          {inst.accountType} &bull; {inst.repositorySelection} repos
                        </div>
                      </div>
                      {inst.suspended && (
                        <span className="text-xs text-(--danger) font-medium">Suspended</span>
                      )}
                    </div>
                  ))}
                  <div className="pt-2">
                    <a
                      href="/api/v1/integrations/github/install"
                      className="inline-block px-3 py-1.5 bg-(--surface) border border-(--line-strong) text-sm font-medium rounded-md hover:bg-(--line) transition"
                    >
                      + Add another organization
                    </a>
                  </div>
                </div>
              ) : (
                <div className="pt-4 space-y-3">
                  <p className="text-sm text-(--fg-subtle)">
                    Install the Firebreak GitHub App on your personal account or organization to enable commit tracing.
                  </p>
                  <a
                    href="/api/v1/integrations/github/install"
                    className="inline-block px-4 py-2 bg-(--fg) text-(--bg) font-medium text-sm rounded-md hover:opacity-90 transition"
                  >
                    Install GitHub App
                  </a>
                </div>
              )}
            </div>

            {/* Vercel Card */}
            <div className="p-6 bg-(--bg-raised) border border-(--line) rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">Vercel</h2>
                  <p className="text-sm text-(--fg-muted)">Production deployments and instant rollbacks</p>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    state?.vercel.connected
                      ? "bg-(--ok)/20 text-(--ok)"
                      : "bg-(--warn)/20 text-(--warn)"
                  }`}
                >
                  {state?.vercel.connected ? "Connected" : "Not connected"}
                </span>
              </div>

              {state?.vercel.connected ? (
                <div className="space-y-4 pt-2">
                  <div className="p-3 bg-(--surface) border border-(--line) rounded-lg text-sm space-y-1">
                    <div className="font-semibold text-(--fg)">{state.vercel.accountLabel}</div>
                    <div className="text-xs text-(--fg-muted)">
                      Token: &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;{state.vercel.last4}
                    </div>
                    {state.vercel.teamSlug && (
                      <div className="text-xs text-(--fg-muted)">Team: {state.vercel.teamSlug}</div>
                    )}
                  </div>
                  <button
                    onClick={handleDisconnectVercel}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs text-(--danger) hover:bg-(--danger)/10 border border-(--danger)/30 rounded-md font-medium transition"
                  >
                    Disconnect Vercel
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnectVercel} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-(--fg-muted) mb-1">
                      Vercel Token (project or team scoped)
                    </label>
                    <input
                      type="password"
                      value={vercelToken}
                      onChange={(e) => setVercelToken(e.target.value)}
                      placeholder="vcp_..."
                      required
                      className="w-full px-3 py-2 bg-(--surface) border border-(--line) rounded-md text-sm font-mono focus:outline-none focus:border-(--accent)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-(--fg-muted) mb-1">
                      Team ID (optional)
                    </label>
                    <input
                      type="text"
                      value={vercelTeamId}
                      onChange={(e) => setVercelTeamId(e.target.value)}
                      placeholder="team_..."
                      className="w-full px-3 py-2 bg-(--surface) border border-(--line) rounded-md text-sm font-mono focus:outline-none focus:border-(--accent)"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full px-4 py-2 bg-(--fg) text-(--bg) font-medium text-sm rounded-md hover:opacity-90 transition disabled:opacity-50"
                  >
                    {isPending ? "Connecting..." : "Connect Vercel"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
