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
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const PREFLIGHT_LABELS: Record<string, string> = {
  target_ready: "Target ready in Vercel",
  target_differs: "Target differs from faulty deploy",
  target_not_known_bad: "Target not flagged as bad",
  no_drift: "No production drift detected",
  not_expired: "Action proposal within TTL",
  still_failing: "Production health check failing",
};

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
  const [showPreflightDetails, setShowPreflightDetails] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [elapsedDuration, setElapsedDuration] = useState("");

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

  // Duration timer
  useEffect(() => {
    if (!detail) return;
    const updateDuration = () => {
      const start = new Date(detail.incident.openedAt).getTime();
      const end = detail.incident.resolvedAt
        ? new Date(detail.incident.resolvedAt).getTime()
        : Date.now();
      const diffSec = Math.max(0, Math.floor((end - start) / 1000));
      const mm = String(Math.floor(diffSec / 60)).padStart(2, "0");
      const ss = String(diffSec % 60).padStart(2, "0");
      setElapsedDuration(`${mm}:${ss}`);
    };

    updateDuration();
    if (!detail.incident.resolvedAt && detail.incident.status !== "dismissed") {
      const interval = setInterval(updateDuration, 1000);
      return () => clearInterval(interval);
    }
  }, [detail]);

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

  // Top suspect and secondary suspects
  const topSuspect = suspects[0];
  const secondarySuspects = suspects.slice(1);

  // Preflight checks status
  const allPreflightPass = action?.preflight?.every((c) => c.ok) ?? false;
  const preflightCount = action?.preflight?.length ?? 0;
  const preflightPassedCount = action?.preflight?.filter((c) => c.ok).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite" role="status">
        {liveAnnouncement}
      </div>

      {/* Incident Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[var(--line)]">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs font-bold text-[var(--accent)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">
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
              <strong className="text-[var(--fg)]">{service.name}</strong>{" "}
              <span className="text-[var(--fg-subtle)]">
                ({service.repoOwner}/{service.repoName})
              </span>
            </span>
            <span className="text-[var(--line-strong)]">•</span>
            <span className="flex items-center gap-1 text-[var(--fg-subtle)]">
              <Clock className="w-3.5 h-3.5" />
              {elapsedDuration ? `${elapsedDuration}` : new Date(incident.openedAt).toLocaleTimeString()}
            </span>
            <span className="text-[var(--line-strong)]">•</span>
            <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--fg-subtle)] border border-[var(--line)]">
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
                  className="px-3 py-1.5 text-xs font-mono rounded-lg bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--fg)] transition"
                >
                  Retry Trace
                </button>
              )}
              <button
                type="button"
                onClick={handleResolve}
                className="px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition"
              >
                Mark Resolved
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-mono rounded-lg bg-[var(--surface)] text-[var(--fg-muted)] border border-[var(--line)] hover:bg-[var(--line)] transition"
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
        <div className="lg:col-span-8 space-y-5">
          {/* 1. Streamlined Deployments Comparison */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--line)]">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--fg-subtle)]">
                Deployment Boundary Comparison
              </span>
              <span className="text-[11px] font-mono text-[var(--fg-subtle)]">
                Vercel Production Alias
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              {/* Bad deployment */}
              <div className="p-3.5 rounded-lg bg-rose-950/15 border border-rose-900/30 space-y-2">
                <div className="flex items-center justify-between text-rose-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    FAULTY DEPLOYMENT
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300">
                    Active
                  </span>
                </div>
                <div className="text-[var(--fg)] font-bold text-sm tracking-wide">
                  {incident.badDeployment?.sha
                    ? incident.badDeployment.sha.slice(0, 7)
                    : incident.badDeployment?.id ?? "Unknown"}
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-[var(--fg-subtle)]">
                    {incident.badDeployment?.createdAt
                      ? new Date(incident.badDeployment.createdAt).toLocaleTimeString() + " UTC"
                      : "Production"}
                  </span>
                  {incident.badDeployment?.url && (
                    <a
                      href={
                        incident.badDeployment.url.startsWith("http")
                          ? incident.badDeployment.url
                          : `https://${incident.badDeployment.url}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <span>View deploy</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Recovery Target */}
              <div className="p-3.5 rounded-lg bg-emerald-950/15 border border-emerald-900/30 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    RECOVERY TARGET
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300">
                    Last Good
                  </span>
                </div>
                <div className="text-[var(--fg)] font-bold text-sm tracking-wide">
                  {incident.goodDeployment?.sha
                    ? incident.goodDeployment.sha.slice(0, 7)
                    : incident.goodDeployment?.id ?? "Unknown"}
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-[var(--fg-subtle)]">
                    {incident.goodDeployment?.createdAt
                      ? new Date(incident.goodDeployment.createdAt).toLocaleTimeString() + " UTC"
                      : "Target"}
                  </span>
                  {incident.goodDeployment?.url && (
                    <a
                      href={
                        incident.goodDeployment.url.startsWith("http")
                          ? incident.goodDeployment.url
                          : `https://${incident.goodDeployment.url}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <span>View deploy</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Suspect Commits Card */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--fg)]">
                  Suspect Commits
                </h2>
                <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                  Deterministic scoring between bad and last-good deployments
                </p>
              </div>
              <span className="text-xs font-mono text-[var(--fg-subtle)]">
                {suspects.length} {suspects.length === 1 ? "commit" : "commits"} evaluated
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
                {/* Highlight Top Suspect */}
                {topSuspect && (
                  <div className="rounded-lg border border-rose-900/40 bg-rose-950/10 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                            Top Suspect #1
                          </span>
                          <a
                            href={`https://github.com/${service.repoOwner}/${service.repoName}/commit/${topSuspect.sha}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
                          >
                            <span>{topSuspect.shortSha}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-xs font-medium text-[var(--fg)]">
                            {topSuspect.message}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[var(--fg-muted)]">
                          by {topSuspect.author} • {new Date(topSuspect.committedAt).toLocaleTimeString()} UTC
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-rose-400">
                          {topSuspect.points} pts
                        </span>
                      </div>
                    </div>

                    {/* Evidence summary */}
                    {topSuspect.evidence && topSuspect.evidence.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {topSuspect.evidence.map((ev) => (
                          <span
                            key={ev.id}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--fg-muted)]"
                          >
                            {ev.label} (+{ev.points})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Diff toggle */}
                    {topSuspect.files && topSuspect.files.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => toggleSuspect(topSuspect.id)}
                          className="flex items-center gap-1 text-[11px] font-mono text-[var(--accent)] hover:underline"
                        >
                          {expandedSuspects[topSuspect.id] ? (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Hide code diffs ({topSuspect.files.length} {topSuspect.files.length === 1 ? "file" : "files"})</span>
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-3.5 h-3.5" />
                              <span>View code diffs ({topSuspect.files.length} {topSuspect.files.length === 1 ? "file" : "files"})</span>
                            </>
                          )}
                        </button>

                        {expandedSuspects[topSuspect.id] && (
                          <div className="mt-3 space-y-3 pt-3 border-t border-[var(--line)]">
                            {topSuspect.files.map((file) => (
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
                    )}
                  </div>
                )}

                {/* Secondary Suspects */}
                {secondarySuspects.map((suspect) => {
                  const isExpanded = !!expandedSuspects[suspect.id];
                  const hasFiles = suspect.files && suspect.files.length > 0;

                  return (
                    <div
                      key={suspect.id}
                      className="rounded-lg border border-[var(--line)] bg-[var(--surface)]/50 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--fg-subtle)] bg-[var(--surface)] border border-[var(--line)]">
                              #{suspect.rank}
                            </span>
                            <a
                              href={`https://github.com/${service.repoOwner}/${service.repoName}/commit/${suspect.sha}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                            >
                              <span>{suspect.shortSha}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="text-xs text-[var(--fg)]">
                              {suspect.message}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[var(--fg-subtle)]">
                            by {suspect.author} • {new Date(suspect.committedAt).toLocaleTimeString()} UTC
                          </div>
                        </div>

                        <span className="text-xs font-mono text-[var(--fg-muted)] shrink-0">
                          {suspect.points} pts
                        </span>
                      </div>

                      {hasFiles && (
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleSuspect(suspect.id)}
                            className="flex items-center gap-1 text-[11px] font-mono text-[var(--accent)] hover:underline"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>Hide diffs</span>
                              </>
                            ) : (
                              <>
                                <ChevronRight className="w-3.5 h-3.5" />
                                <span>View diffs ({suspect.files.length} files)</span>
                              </>
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2 pt-2 border-t border-[var(--line)]">
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. AI Explanation Card */}
          <ExplanationCard incidentId={incident.id} analysis={analysis} />

          {/* 4. Incident Timeline */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--fg)] pb-2.5 border-b border-[var(--line)]">
              Incident Timeline
            </h2>

            <div className="space-y-2.5 font-mono text-xs">
              {timeline.length === 0 ? (
                <p className="text-[var(--fg-muted)]">No timeline events recorded.</p>
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
                      className="flex items-start gap-2.5 pb-2 border-b border-[var(--line)]/40 last:border-0"
                    >
                      <span className="text-[var(--fg-subtle)] text-[11px] w-16 shrink-0 pt-0.5">
                        {new Date(evt.at).toLocaleTimeString()}
                      </span>
                      <span
                        className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center bg-[var(--surface)] text-[var(--accent)] border border-[var(--line)] shrink-0 mt-0.5"
                        title={`Actor: ${evt.actorType}`}
                      >
                        {actorBadge}
                      </span>
                      <span className="text-[var(--fg)] flex-1 text-xs leading-relaxed">
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
        <aside className="lg:col-span-4 sticky top-6 space-y-4">
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
              {/* Header */}
              <div className="pb-3 border-b border-[var(--line)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--fg-subtle)]">
                    Action Plan
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                      action.status === "verified"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : action.status === "awaiting_approval"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-[var(--surface)] text-[var(--fg-muted)]"
                    }`}
                  >
                    {action.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[var(--fg)] leading-snug">
                  {action.message}
                </h3>
                <div className="text-xs font-mono text-[var(--fg-muted)]">
                  Target SHA:{" "}
                  <span className="text-[var(--accent)] font-semibold">
                    {action.target?.shortSha ?? action.target?.id?.slice(0, 7)}
                  </span>
                </div>
              </div>

              {/* Preflight Safety Checks (Streamlined Summary & Expandable Details) */}
              {action.preflight && action.preflight.length > 0 && (
                <div className="space-y-2">
                  <div
                    className={`rounded-lg border p-2.5 transition flex items-center justify-between ${
                      allPreflightPass
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-amber-500/10 border-amber-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {allPreflightPass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-[var(--fg)]">
                        {allPreflightPass
                          ? `All ${preflightCount} preflight checks verified`
                          : `${preflightPassedCount} of ${preflightCount} checks passed`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPreflightDetails(!showPreflightDetails)}
                      className="text-[11px] font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-0.5 ml-2"
                    >
                      <span>{showPreflightDetails ? "Hide" : "Review"}</span>
                      {showPreflightDetails ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {showPreflightDetails && (
                    <div className="space-y-1 font-mono text-xs pt-1">
                      {action.preflight.map((check) => (
                        <div
                          key={check.id}
                          className="flex items-center justify-between p-1.5 px-2.5 rounded bg-[var(--surface)] border border-[var(--line)]"
                        >
                          <span className="text-[var(--fg-muted)] text-[11px] truncate max-w-[200px]" title={check.detail || check.id}>
                            {PREFLIGHT_LABELS[check.id] || check.id}
                          </span>
                          {check.ok ? (
                            <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                              <span>PASS</span>
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold text-[11px]">
                              {check.blocking ? "BLOCK" : "WARN"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* State 1: Awaiting Approval */}
              {action.status === "awaiting_approval" && (
                <div className="space-y-2.5 pt-1">
                  <HoldToConfirm
                    onConfirm={() => handleApprove(action.id)}
                    label="Hold to Approve Rollback"
                    disabled={actionLoading}
                  />
                  <button
                    type="button"
                    onClick={() => handleReject(action.id)}
                    disabled={actionLoading}
                    className="w-full py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--line)] border border-[var(--line)] text-xs font-mono text-[var(--fg-muted)] transition"
                  >
                    Reject Rollback
                  </button>
                  <div className="text-[10px] font-mono text-[var(--fg-subtle)] text-center">
                    Expires at {new Date(action.expiresAt).toLocaleTimeString()} UTC
                  </div>
                </div>
              )}

              {/* State 2: Executing */}
              {action.status === "executing" && (
                <div className="py-3 text-center space-y-2">
                  <RefreshCw className="w-5 h-5 text-[var(--info)] animate-spin mx-auto" />
                  <div className="text-xs font-semibold text-[var(--fg)]">
                    Deploying rollback on Vercel…
                  </div>
                  <p className="text-[11px] font-mono text-[var(--fg-muted)]">
                    Restoring last-good SHA to production alias
                  </p>
                </div>
              )}

              {/* State 3: Verifying */}
              {action.status === "verifying" && (
                <div className="space-y-2.5">
                  <div className="text-xs font-mono font-semibold text-[var(--info)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--info)] animate-pulse" />
                    <span>Verifying Health Check Probes…</span>
                  </div>
                  <ProbeStrip probes={action.probes} max={18} />
                </div>
              )}

              {/* State 4: Verified Recovery */}
              {action.status === "verified" && (
                <div className="space-y-2 text-center py-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div className="text-xs font-bold text-emerald-400">
                    Production Recovered
                  </div>
                  <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                    3 consecutive health probes returned 200 OK. Traffic is healthy on target deployment.
                  </p>
                </div>
              )}

              {/* State 5: Failure */}
              {(action.status === "failed" ||
                action.status === "verification_failed" ||
                action.status === "rejected" ||
                action.status === "expired") && (
                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-xs font-mono text-rose-300 space-y-1">
                  <div className="font-bold uppercase text-[10px]">{action.status.replace("_", " ")}</div>
                  <p className="text-[11px]">{action.message}</p>
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
