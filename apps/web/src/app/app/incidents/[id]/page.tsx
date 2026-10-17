"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import type { IncidentDetail } from "@firebreak/core";

export default function IncidentRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIncident = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/incidents/${id}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) {
          setError("Incident not found");
          return;
        }
        throw new Error(`Failed to load incident (${res.status})`);
      }
      const json = await res.json();
      setDetail(json.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIncident();
    }, 0);
    const interval = setInterval(fetchIncident, 2000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchIncident]);

  const handleApprove = async (actionId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/actions/${actionId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: "Approved via Incident Room" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error?.message || "Failed to approve action");
      }
      await fetchIncident();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (actionId: string) => {
    if (!confirm("Are you sure you want to reject this proposed rollback?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/actions/${actionId}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: "Rejected by operator" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error?.message || "Failed to reject action");
      }
      await fetchIncident();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    const note = prompt("Resolution note (optional):");
    try {
      const res = await fetch(`/api/v1/incidents/${id}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error?.message || "Failed to resolve incident");
      }
      await fetchIncident();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDismiss = async () => {
    if (!confirm("Are you sure you want to dismiss this incident?")) return;
    try {
      const res = await fetch(`/api/v1/incidents/${id}/dismiss`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: "Dismissed by operator" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error?.message || "Failed to dismiss incident");
      }
      await fetchIncident();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleRetrace = async () => {
    try {
      const res = await fetch(`/api/v1/incidents/${id}/retrace`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error?.message || "Failed to trigger retrace");
      }
      await fetchIncident();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (loading && !detail) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex items-center justify-center p-6 font-mono text-sm">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-ping" />
          <span>Connecting to Incident Room #{id}...</span>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] p-6">
        <div className="max-w-2xl mx-auto border border-rose-900/50 bg-rose-950/20 rounded-xl p-6 text-center space-y-4">
          <h2 className="text-lg font-semibold text-rose-400">Error Loading Incident</h2>
          <p className="text-sm text-[var(--fg-muted)]">{error || "Unknown error"}</p>
          <Link
            href="/app"
            className="inline-block px-4 py-2 bg-[var(--surface)] text-xs font-mono rounded-lg hover:bg-[var(--line)]"
          >
            &larr; Back to Console
          </Link>
        </div>
      </div>
    );
  }

  const { incident, service, suspects, action, timeline } = detail;
  const isTerminal = incident.status === "resolved" || incident.status === "dismissed";

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-[var(--line)] bg-[var(--bg-raised)] px-6 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="text-xs font-mono text-[var(--fg-muted)] hover:text-[var(--fg)] transition flex items-center gap-1"
          >
            &larr; Console
          </Link>
          <span className="text-[var(--line-strong)]">/</span>
          <span className="font-mono text-sm font-semibold tracking-tight text-[var(--accent)]">
            INC-{incident.number}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-mono uppercase bg-[var(--surface)] border border-[var(--line)] text-[var(--fg-muted)]">
            {incident.status}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono uppercase ${
              incident.severity === "critical"
                ? "bg-rose-950/40 text-rose-400 border border-rose-800/40"
                : "bg-amber-950/40 text-amber-400 border border-amber-800/40"
            }`}
          >
            {incident.severity}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isTerminal && (
            <>
              {(incident.traceStatus === "failed" || incident.traceStatus === "pending") && (
                <button
                  onClick={handleRetrace}
                  className="px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface)] border border-[var(--line-strong)] hover:bg-[var(--line)]"
                >
                  Retry Trace
                </button>
              )}
              <button
                onClick={handleResolve}
                className="px-3 py-1.5 text-xs font-mono rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/40"
              >
                Mark Resolved
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface)] text-[var(--fg-muted)] border border-[var(--line)] hover:bg-[var(--line)]"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Incident Summary Card */}
        <div className="border border-[var(--line)] bg-[var(--bg-raised)] rounded-xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-[var(--fg-muted)]">
                Service: <strong className="text-[var(--fg)]">{service.name}</strong> ({service.repoOwner}/{service.repoName})
              </span>
              <h1 className="text-2xl font-bold tracking-tight mt-1">{incident.title}</h1>
            </div>
            <div className="text-right text-xs font-mono text-[var(--fg-muted)]">
              <div>Opened: {new Date(incident.openedAt).toLocaleTimeString()}</div>
              <div>Alerts: {incident.alertCount}</div>
            </div>
          </div>

          {/* Deployments Rail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-[var(--surface)] border border-rose-900/30 rounded-lg">
              <span className="text-xs font-mono text-rose-400 block mb-1">
                &bull; Bad Deployment (Live at alert)
              </span>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--fg)] font-semibold">
                  {incident.badDeployment?.sha ? incident.badDeployment.sha.slice(0, 7) : incident.badDeployment?.id ?? "Unknown"}
                </span>
                {incident.badDeployment?.url && (
                  <a
                    href={incident.badDeployment.url.startsWith("http") ? incident.badDeployment.url : `https://${incident.badDeployment.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    View on Vercel &rarr;
                  </a>
                )}
              </div>
            </div>

            <div className="p-3 bg-[var(--surface)] border border-emerald-900/30 rounded-lg">
              <span className="text-xs font-mono text-emerald-400 block mb-1">
                &bull; Rollback Target (Last Good)
              </span>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--fg)] font-semibold">
                  {incident.goodDeployment?.sha ? incident.goodDeployment.sha.slice(0, 7) : incident.goodDeployment?.id ?? "None"}
                </span>
                {incident.goodDeployment?.url && (
                  <a
                    href={incident.goodDeployment.url.startsWith("http") ? incident.goodDeployment.url : `https://${incident.goodDeployment.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    View on Vercel &rarr;
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Hero Card */}
        {action && (
          <div
            className={`border rounded-xl p-6 shadow-sm transition-all ${
              action.status === "awaiting_approval"
                ? "border-amber-600/40 bg-amber-950/10"
                : action.status === "verified"
                ? "border-emerald-600/40 bg-emerald-950/10"
                : action.status === "executing" || action.status === "verifying"
                ? "border-blue-600/40 bg-blue-950/10"
                : action.status === "failed" || action.status === "verification_failed"
                ? "border-rose-600/40 bg-rose-950/10"
                : "border-[var(--line)] bg-[var(--bg-raised)]"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--line)] pb-4 mb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-muted)]">
                  Automated Mitigation Plan
                </span>
                <h2 className="text-lg font-bold flex items-center gap-2 mt-0.5">
                  <span>{action.message}</span>
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono px-3 py-1 rounded-full uppercase bg-[var(--surface)] border border-[var(--line)]">
                  Status: {action.status}
                </span>
              </div>
            </div>

            {/* Preflight Checks */}
            {action.preflight && action.preflight.length > 0 && (
              <div className="mb-4">
                <span className="text-xs font-mono text-[var(--fg-muted)] block mb-2">
                  Preflight Safety Checks:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
                  {action.preflight.map((check) => (
                    <div
                      key={check.id}
                      className={`p-2 rounded border flex items-center gap-2 ${
                        check.ok
                          ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-300"
                          : check.blocking
                          ? "bg-rose-950/20 border-rose-900/30 text-rose-300"
                          : "bg-amber-950/20 border-amber-900/30 text-amber-300"
                      }`}
                    >
                      <span>{check.ok ? "✓" : "✗"}</span>
                      <span className="truncate">{check.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons for Awaiting Approval */}
            {action.status === "awaiting_approval" && (
              <div className="flex items-center gap-4 pt-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleApprove(action.id)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? "Dispatching..." : "Approve Rollback"}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleReject(action.id)}
                  className="px-4 py-2.5 bg-[var(--surface)] hover:bg-[var(--line)] border border-[var(--line-strong)] text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  Reject
                </button>
                <span className="text-xs font-mono text-[var(--fg-muted)]">
                  Expires in: {new Date(action.expiresAt).toLocaleTimeString()}
                </span>
              </div>
            )}

            {/* Health Probes Live Strip */}
            {action.probes && action.probes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--line)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[var(--fg-muted)]">
                    Health Verification Probes (Target: 3 consecutive healthy checks):
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 font-mono text-xs">
                  {action.probes.map((probe) => (
                    <div
                      key={probe.seq}
                      className={`p-2 rounded border text-center ${
                        probe.ok
                          ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-400"
                          : "bg-rose-950/30 border-rose-800/40 text-rose-400"
                      }`}
                    >
                      <div className="font-bold">
                        #{probe.seq} {probe.ok ? "OK" : "FAIL"}
                      </div>
                      <div className="text-[10px] text-[var(--fg-muted)]">
                        {probe.latencyMs ?? 0}ms &bull; {probe.httpStatus ?? "err"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suspect Commits Section */}
        <div className="border border-[var(--line)] bg-[var(--bg-raised)] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div>
              <h2 className="text-lg font-bold">Ranked Suspect Commits</h2>
              <p className="text-xs text-[var(--fg-muted)]">
                Analyzed diffs between {incident.goodDeployment?.sha?.slice(0, 7) ?? "good"} and {incident.badDeployment?.sha?.slice(0, 7) ?? "bad"}
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--fg-muted)]">
              {suspects.length} commits analyzed
            </span>
          </div>

          {suspects.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-[var(--fg-muted)]">
              {incident.traceStatus === "pending"
                ? "Tracing commits between deployments..."
                : "No suspect commits found."}
            </div>
          ) : (
            <div className="space-y-4">
              {suspects.map((suspect) => (
                <div
                  key={suspect.id}
                  className={`border rounded-lg p-4 space-y-3 ${
                    suspect.rank === 1
                      ? "border-rose-900/40 bg-rose-950/10"
                      : "border-[var(--line)] bg-[var(--surface)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                            suspect.rank === 1
                              ? "bg-rose-600 text-white"
                              : "bg-[var(--line)] text-[var(--fg-muted)]"
                          }`}
                        >
                          #{suspect.rank}
                        </span>
                        <a
                          href={suspect.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-sm font-semibold hover:underline text-[var(--accent)]"
                        >
                          {suspect.shortSha}
                        </a>
                        <span className="text-sm font-medium text-[var(--fg)]">
                          {suspect.message}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--fg-muted)] font-mono">
                        by {suspect.author} &bull; {new Date(suspect.committedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-rose-400 block">
                        {suspect.points} pts
                      </span>
                    </div>
                  </div>

                  {/* Evidence Tags */}
                  {suspect.evidence && suspect.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {suspect.evidence.map((ev) => (
                        <span
                          key={ev.id}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--line)] text-[var(--fg-muted)]"
                        >
                          {ev.label} (+{ev.points})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Patch Excerpt */}
                  {suspect.files && suspect.files.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[var(--line)]">
                      {suspect.files.map((file) => (
                        <div key={file.path} className="text-xs font-mono space-y-1">
                          <div className="flex items-center justify-between text-[var(--fg-muted)]">
                            <span className={file.matched ? "text-amber-400 font-semibold" : ""}>
                              {file.path}
                            </span>
                            <span>
                              +{file.additions} -{file.deletions}
                            </span>
                          </div>
                          {file.patchExcerpt && (
                            <pre className="p-3 bg-[var(--bg)] border border-[var(--line)] rounded overflow-x-auto text-[11px] leading-relaxed text-[var(--fg-muted)]">
                              {file.patchExcerpt.split("\n").map((line, idx) => (
                                <div
                                  key={idx}
                                  className={
                                    line.startsWith("+")
                                      ? "text-emerald-400 bg-emerald-950/20"
                                      : line.startsWith("-")
                                      ? "text-rose-400 bg-rose-950/20"
                                      : ""
                                  }
                                >
                                  {line}
                                </div>
                              ))}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="border border-[var(--line)] bg-[var(--bg-raised)] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold border-b border-[var(--line)] pb-3">
            Incident Timeline
          </h2>
          <div className="space-y-3 font-mono text-xs">
            {timeline.length === 0 ? (
              <p className="text-[var(--fg-muted)]">No timeline events recorded yet.</p>
            ) : (
              timeline.map((evt) => (
                <div key={evt.id} className="flex items-start gap-4 pb-2 border-b border-[var(--line)]/40 last:border-0">
                  <span className="text-[var(--fg-muted)] w-20 shrink-0">
                    {new Date(evt.at).toLocaleTimeString()}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[10px] uppercase text-[var(--accent)] shrink-0">
                    {evt.actorType}
                  </span>
                  <span className="text-[var(--fg)] flex-1">{evt.summary}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
