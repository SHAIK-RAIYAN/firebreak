"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import type { IncidentDetail } from "@firebreak/core";
import { StatusPill } from "@/components/ui/status-pill";
import { LoopRail, getStepIndexFromStatus } from "@/components/ui/loop-rail";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { ProbeStrip } from "@/components/ui/probe-strip";
import { DiffBlock } from "@/components/ui/diff-block";
import { ExplanationCard } from "@/components/ui/explanation-card";
import {
  ExternalLink,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

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
  const [expandedSuspects, setExpandedSuspects] = useState<Record<string, boolean>>({});
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

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
      const newDetail: IncidentDetail = json.data;

      // Announce status changes
      if (detail && detail.incident.status !== newDetail.incident.status) {
        setLiveAnnouncement(
          `Incident status changed to ${newDetail.incident.status}`,
        );
      }

      setDetail(newDetail);
      setError(null);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, detail]);

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
      } else {
        setLiveAnnouncement("Rollback approved. Vercel deployment triggered.");
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
      } else {
        setLiveAnnouncement("Incident marked as resolved.");
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

  const toggleSuspect = (suspectId: string) => {
    setExpandedSuspects((prev) => ({
      ...prev,
      [suspectId]: !prev[suspectId],
    }));
  };

  if (loading && !detail) {
    return (
      <div className="py-24 flex items-center justify-center font-mono text-xs text-[var(--fg-muted)] space-x-3">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-ping" />
        <span>Connecting to Incident Room #{id}…</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-4">
        <div className="p-6 rounded-xl border border-rose-900/40 bg-rose-950/20 text-rose-300 space-y-2">
          <h2 className="text-base font-bold">Error Loading Incident</h2>
          <p className="text-xs font-mono">{error || "Incident not found"}</p>
        </div>
        <Link
          href="/app/incidents"
          className="inline-block px-4 py-2 text-xs font-mono rounded-lg bg-[var(--surface)] border border-[var(--line)] text-[var(--fg)] hover:bg-[var(--line)]"
        >
          &larr; Back to Incidents
        </Link>
      </div>
    );
  }

  const { incident, service, suspects, action, timeline, analysis } = detail;
  const isTerminal =
    incident.status === "resolved" || incident.status === "dismissed";
  const stepIndex = getStepIndexFromStatus(incident.status, action?.status);

  return (
    <div className="space-y-6">
      {/* Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite" role="status">
        {liveAnnouncement}
      </div>

      {/* Incident Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[var(--line)]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm font-bold text-[var(--accent)]">
              INC-{incident.number}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--fg)]">
              {incident.title}
            </h1>
            <StatusPill status={incident.status} />
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-[var(--fg-muted)] flex-wrap">
            <span>
              Service:{" "}
              <strong className="text-[var(--fg)]">{service.name}</strong> (
              {service.repoOwner}/{service.repoName})
            </span>
            <span>&bull;</span>
            <span>Opened {new Date(incident.openedAt).toLocaleTimeString()} UTC</span>
            <span>&bull;</span>
            <span className="uppercase font-semibold px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--fg)]">
              {incident.severity}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          {!isTerminal && (
            <>
              {(incident.traceStatus === "failed" ||
                incident.traceStatus === "pending") && (
                <button
                  type="button"
                  onClick={handleRetrace}
                  className="px-3 py-1.5 text-xs font-mono rounded-lg bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--fg)]"
                >
                  Retry Trace
                </button>
              )}
              <button
                type="button"
                onClick={handleResolve}
                className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[var(--ok)] hover:bg-emerald-500/20"
              >
                Mark Resolved
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-mono rounded-lg bg-[var(--surface)] text-[var(--fg-muted)] border border-[var(--line)] hover:bg-[var(--line)]"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>

      {/* 6-step LoopRail */}
      <LoopRail currentStep={stepIndex} />

      {/* 2-Column Responsive Layout (8 cols Main + 4 cols Sticky Rail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Deployments Strip */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-5 space-y-3">
            <h2 className="text-xs font-mono font-bold text-[var(--fg-subtle)] uppercase tracking-wider">
              Deployments Boundary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              {/* Bad deployment */}
              <div className="p-3.5 rounded-lg bg-rose-950/15 border border-rose-900/30 space-y-1.5">
                <div className="flex items-center justify-between text-rose-400 font-semibold">
                  <span>PRODUCTION (Bad)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/40">
                    Live at alert
                  </span>
                </div>
                <div className="text-[var(--fg)] font-bold text-sm">
                  {incident.badDeployment?.sha
                    ? incident.badDeployment.sha.slice(0, 7)
                    : incident.badDeployment?.id ?? "Unknown"}
                </div>
                {incident.badDeployment?.url && (
                  <a
                    href={
                      incident.badDeployment.url.startsWith("http")
                        ? incident.badDeployment.url
                        : `https://${incident.badDeployment.url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 pt-1"
                  >
                    <span>View deployment</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Last Good deployment */}
              <div className="p-3.5 rounded-lg bg-emerald-950/15 border border-emerald-900/30 space-y-1.5">
                <div className="flex items-center justify-between text-[var(--ok)] font-semibold">
                  <span>LAST GOOD</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40">
                    Target
                  </span>
                </div>
                <div className="text-[var(--fg)] font-bold text-sm">
                  {incident.goodDeployment?.sha
                    ? incident.goodDeployment.sha.slice(0, 7)
                    : incident.goodDeployment?.id ?? "Unknown"}
                </div>
                {incident.goodDeployment?.url && (
                  <a
                    href={
                      incident.goodDeployment.url.startsWith("http")
                        ? incident.goodDeployment.url
                        : `https://${incident.goodDeployment.url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 pt-1"
                  >
                    <span>View deployment</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 2. Suspect Commits Card */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h2 className="text-base font-bold text-[var(--fg)]">
                  Ranked Suspect Commits
                </h2>
                <p className="text-xs text-[var(--fg-muted)]">
                  Deterministic scoring between bad and last-good deployments
                </p>
              </div>
              <span className="text-xs font-mono text-[var(--fg-subtle)]">
                {suspects.length} commits
              </span>
            </div>

            {suspects.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[var(--fg-muted)]">
                {incident.traceStatus === "pending"
                  ? "Tracing commits between deployments…"
                  : "No suspect commits found."}
              </div>
            ) : (
              <div className="space-y-3">
                {suspects.map((suspect) => {
                  const isExpanded = !!expandedSuspects[suspect.id];
                  const hasFiles = suspect.files && suspect.files.length > 0;

                  return (
                    <div
                      key={suspect.id}
                      className={`rounded-lg border transition-all ${
                        suspect.rank === 1
                          ? "border-rose-900/40 bg-rose-950/10"
                          : "border-[var(--line)] bg-[var(--surface)]"
                      }`}
                    >
                      {/* Suspect Header */}
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                  suspect.rank === 1
                                    ? "bg-rose-500/20 text-rose-300"
                                    : "bg-[var(--bg)] text-[var(--fg-muted)]"
                                }`}
                              >
                                #{suspect.rank}
                              </span>
                              <a
                                href={`https://github.com/${service.repoOwner}/${service.repoName}/commit/${suspect.sha}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
                              >
                                <span>{suspect.shortSha}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <span className="text-xs font-medium text-[var(--fg)]">
                                {suspect.message}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-[var(--fg-muted)]">
                              by {suspect.author} &bull;{" "}
                              {new Date(suspect.committedAt).toLocaleTimeString()}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold text-rose-400 block">
                              {suspect.points} pts
                            </span>
                          </div>
                        </div>

                        {/* Evidence Chips */}
                        {suspect.evidence && suspect.evidence.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {suspect.evidence.map((ev) => (
                              <span
                                key={ev.id}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--line)] text-[var(--fg-muted)]"
                              >
                                {ev.label} (+{ev.points})
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Expand Diffs Button */}
                        {hasFiles && (
                          <button
                            type="button"
                            onClick={() => toggleSuspect(suspect.id)}
                            className="flex items-center gap-1 text-[11px] font-mono text-[var(--accent)] hover:underline pt-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>Hide diffs ({suspect.files.length} files)</span>
                              </>
                            ) : (
                              <>
                                <ChevronRight className="w-3.5 h-3.5" />
                                <span>View diffs ({suspect.files.length} files)</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expanded Diffs */}
                      {isExpanded && hasFiles && (
                        <div className="p-4 border-t border-[var(--line)] space-y-3 bg-[var(--bg-raised)]">
                          {suspect.files.map((file) => (
                            <DiffBlock
                              key={file.path}
                              filename={file.path}
                              patch={file.patchExcerpt}
                              matched={file.matched}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. AI Explanation Card */}
          <ExplanationCard incidentId={incident.id} analysis={analysis} />

          {/* 4. Timeline */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-6 space-y-4">
            <h2 className="text-base font-bold text-[var(--fg)] border-b border-[var(--line)] pb-3">
              Incident Timeline
            </h2>

            <div className="space-y-3 font-mono text-xs">
              {timeline.length === 0 ? (
                <p className="text-[var(--fg-muted)]">No events logged yet.</p>
              ) : (
                timeline.map((evt) => {
                  const actorBadge =
                    evt.actorType === "system"
                      ? "S"
                      : evt.actorType === "user"
                      ? "U"
                      : evt.actorType === "mcp"
                      ? "M"
                      : "A";

                  return (
                    <div
                      key={evt.id}
                      className="flex items-start gap-3 pb-2 border-b border-[var(--line)]/40 last:border-0"
                    >
                      <span className="text-[var(--fg-subtle)] w-18 shrink-0">
                        {new Date(evt.at).toLocaleTimeString()}
                      </span>
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-[var(--surface)] text-[var(--accent)] border border-[var(--line)] shrink-0"
                        title={`Actor: ${evt.actorType}`}
                      >
                        {actorBadge}
                      </span>
                      <span className="text-[var(--fg)] flex-1 leading-relaxed">
                        {evt.summary}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Rail Column (4 cols, Sticky) */}
        <aside className="lg:col-span-4 sticky top-6 space-y-6">
          {action ? (
            <div
              className={`rounded-xl border p-5 shadow-sm space-y-4 ${
                action.status === "awaiting_approval"
                  ? "border-amber-500/40 bg-amber-950/10"
                  : action.status === "verified"
                  ? "border-emerald-500/40 bg-emerald-950/10"
                  : action.status === "executing" || action.status === "verifying"
                  ? "border-indigo-500/40 bg-indigo-950/10"
                  : action.status === "failed" || action.status === "verification_failed"
                  ? "border-rose-500/40 bg-rose-950/10"
                  : "border-[var(--line)] bg-[var(--bg-raised)]"
              }`}
            >
              <div className="border-b border-[var(--line)] pb-3 space-y-1">
                <div className="text-[10px] font-mono uppercase font-bold text-[var(--fg-subtle)]">
                  Action Plan
                </div>
                <h3 className="text-base font-bold text-[var(--fg)]">
                  {action.message}
                </h3>
                <div className="text-xs font-mono text-[var(--fg-muted)]">
                  Target: {action.target?.shortSha ?? action.target?.id?.slice(0, 10)}
                </div>
              </div>

              {/* Preflight Safety Checks */}
              {action.preflight && action.preflight.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase font-semibold text-[var(--fg-muted)]">
                    Preflight Safety Checks
                  </div>
                  <div className="space-y-1 font-mono text-xs">
                    {action.preflight.map((check) => (
                      <div
                        key={check.id}
                        className="flex items-center justify-between p-2 rounded bg-[var(--surface)] border border-[var(--line)]"
                      >
                        <span className="truncate">{check.id}</span>
                        {check.ok ? (
                          <span className="text-[var(--ok)] font-bold">✓ PASS</span>
                        ) : (
                          <span className="text-[var(--danger)] font-bold">
                            ✕ {check.blocking ? "BLOCK" : "WARN"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* State 1: Awaiting Approval */}
              {action.status === "awaiting_approval" && (
                <div className="space-y-3 pt-2">
                  <HoldToConfirm
                    onConfirm={() => handleApprove(action.id)}
                    label="Approve rollback"
                    disabled={actionLoading}
                  />
                  <button
                    type="button"
                    onClick={() => handleReject(action.id)}
                    disabled={actionLoading}
                    className="w-full py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--line)] border border-[var(--line)] text-xs font-mono text-[var(--fg-muted)] transition"
                  >
                    Reject rollback
                  </button>
                  <div className="text-[11px] font-mono text-[var(--fg-subtle)] text-center">
                    Expires at {new Date(action.expiresAt).toLocaleTimeString()}
                  </div>
                </div>
              )}

              {/* State 2: Executing */}
              {action.status === "executing" && (
                <div className="py-4 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-[var(--info)] animate-spin mx-auto" />
                  <div className="text-sm font-semibold text-[var(--fg)]">
                    Rolling back on Vercel…
                  </div>
                  <p className="text-xs font-mono text-[var(--fg-muted)]">
                    Deploying last-good SHA to production alias
                  </p>
                </div>
              )}

              {/* State 3: Verifying with ProbeStrip */}
              {action.status === "verifying" && (
                <div className="space-y-3">
                  <div className="text-xs font-mono font-semibold text-[var(--info)] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--info)] animate-pulse" />
                    <span>Verifying Health Check…</span>
                  </div>
                  <ProbeStrip probes={action.probes} max={18} />
                </div>
              )}

              {/* State 4: Verified */}
              {action.status === "verified" && (
                <div className="space-y-3 text-center py-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-[var(--ok)] flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <div className="text-sm font-bold text-[var(--ok)]">
                    Production Recovered
                  </div>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Health probes returned healthy responses. Vercel deployment restored.
                  </p>
                </div>
              )}

              {/* State 5: Failure */}
              {(action.status === "failed" ||
                action.status === "verification_failed" ||
                action.status === "rejected" ||
                action.status === "expired") && (
                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-xs font-mono text-rose-300 space-y-1">
                  <div className="font-bold uppercase">{action.status}</div>
                  <p>{action.message}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-5 text-center text-xs font-mono text-[var(--fg-muted)]">
              No rollback action proposed.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
