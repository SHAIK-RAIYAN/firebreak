import Link from "next/link";
import { requireSession } from "@/lib/session";
import {
  listIncidents,
  userCtx,
  type IncidentListItem,
  db,
  services as servicesTable,
  github_installations as githubInstallationsTable,
  vercel_connections as vercelConnectionsTable,
} from "@firebreak/core";
import { eq } from "drizzle-orm";
import { StatusPill } from "@/components/ui/status-pill";
import {
  ShieldAlert,
  CheckCircle2,
  Circle,
  ArrowRight,
  Flame,
  PlusCircle,
  Activity,
  CheckCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { user, workspace } = await requireSession("/app");
  const ctx = userCtx(workspace.id, user.id);
  const database = db();

  // Fetch incidents
  let incidents: IncidentListItem[] = [];
  try {
    const res = await listIncidents(ctx, { status: "all", limit: 10 });
    incidents = res.items;
  } catch (err) {
    console.error("Failed to load incidents:", err);
  }

  // Fetch connections & services to compute onboarding state
  const [githubList, vercelConn, svcList] = await Promise.all([
    database
      .select({ id: githubInstallationsTable.id })
      .from(githubInstallationsTable)
      .where(eq(githubInstallationsTable.workspace_id, workspace.id)),
    database
      .select({ id: vercelConnectionsTable.id })
      .from(vercelConnectionsTable)
      .where(eq(vercelConnectionsTable.workspace_id, workspace.id))
      .limit(1),
    database
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.workspace_id, workspace.id)),
  ]);

  const hasGithub = githubList.length > 0;
  const hasVercel = vercelConn.length > 0;
  const hasService = svcList.length > 0;
  const hasIncident = workspace.incident_seq > 0 || incidents.length > 0;
  const allOnboarded = hasGithub && hasVercel && hasService && hasIncident;

  const activeIncidents = incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "dismissed",
  );
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">
            Overview
          </h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Production incident mitigation and verified rollback system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/app/services/new"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-solid)] text-[var(--accent-fg)] rounded-lg text-xs font-semibold hover:brightness-110 transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Service</span>
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist (shown if any step incomplete) */}
      {!allOnboarded && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--fg)]">
                Getting Started with Firebreak
              </h2>
              <p className="text-xs text-[var(--fg-muted)]">
                Complete these 4 steps to enable automated rollback protection
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[var(--accent)]">
              {[hasGithub, hasVercel, hasService, hasIncident].filter(Boolean).length} / 4 completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Step 1: GitHub */}
            <Link
              href="/app/integrations"
              className={`p-3.5 rounded-lg border transition flex flex-col justify-between group ${
                hasGithub
                  ? "bg-emerald-950/10 border-emerald-800/30 text-[var(--ok)]"
                  : "bg-[var(--surface)] border-[var(--line)] hover:border-[var(--line-strong)] text-[var(--fg)]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-[var(--fg-subtle)]">
                    Step 1
                  </span>
                  {hasGithub ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--fg-subtle)] group-hover:text-[var(--accent)]" />
                  )}
                </div>
                <div className="font-medium text-xs">Connect GitHub</div>
                <p className="text-[11px] text-[var(--fg-muted)]">
                  Install GitHub App for repository access
                </p>
              </div>
              <span className="text-[11px] font-mono mt-3 inline-flex items-center gap-1 text-[var(--accent)]">
                {hasGithub ? "Connected" : "Connect →"}
              </span>
            </Link>

            {/* Step 2: Vercel */}
            <Link
              href="/app/integrations"
              className={`p-3.5 rounded-lg border transition flex flex-col justify-between group ${
                hasVercel
                  ? "bg-emerald-950/10 border-emerald-800/30 text-[var(--ok)]"
                  : "bg-[var(--surface)] border-[var(--line)] hover:border-[var(--line-strong)] text-[var(--fg)]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-[var(--fg-subtle)]">
                    Step 2
                  </span>
                  {hasVercel ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--fg-subtle)] group-hover:text-[var(--accent)]" />
                  )}
                </div>
                <div className="font-medium text-xs">Connect Vercel</div>
                <p className="text-[11px] text-[var(--fg-muted)]">
                  Add deployment token for rollbacks
                </p>
              </div>
              <span className="text-[11px] font-mono mt-3 inline-flex items-center gap-1 text-[var(--accent)]">
                {hasVercel ? "Connected" : "Connect →"}
              </span>
            </Link>

            {/* Step 3: Create Service */}
            <Link
              href="/app/services/new"
              className={`p-3.5 rounded-lg border transition flex flex-col justify-between group ${
                hasService
                  ? "bg-emerald-950/10 border-emerald-800/30 text-[var(--ok)]"
                  : "bg-[var(--surface)] border-[var(--line)] hover:border-[var(--line-strong)] text-[var(--fg)]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-[var(--fg-subtle)]">
                    Step 3
                  </span>
                  {hasService ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--fg-subtle)] group-hover:text-[var(--accent)]" />
                  )}
                </div>
                <div className="font-medium text-xs">Create a Service</div>
                <p className="text-[11px] text-[var(--fg-muted)]">
                  Link repository, Vercel &amp; health URL
                </p>
              </div>
              <span className="text-[11px] font-mono mt-3 inline-flex items-center gap-1 text-[var(--accent)]">
                {hasService ? "Configured" : "Create →"}
              </span>
            </Link>

            {/* Step 4: Test Alert */}
            <div
              className={`p-3.5 rounded-lg border flex flex-col justify-between ${
                hasIncident
                  ? "bg-emerald-950/10 border-emerald-800/30 text-[var(--ok)]"
                  : "bg-[var(--surface)] border-[var(--line)] text-[var(--fg)]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-[var(--fg-subtle)]">
                    Step 4
                  </span>
                  {hasIncident ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--fg-subtle)]" />
                  )}
                </div>
                <div className="font-medium text-xs">Fire Test Alert</div>
                <p className="text-[11px] text-[var(--fg-muted)]">
                  Run <code className="text-[var(--accent)] font-mono">npm run fixture:fire</code>
                </p>
              </div>
              <span className="text-[11px] font-mono mt-3 text-[var(--fg-subtle)]">
                {hasIncident ? "Alert Tested" : "Waiting for alert"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--fg-muted)]">
            <span>ACTIVE INCIDENTS</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--fg)]">
            {activeIncidents.length}
          </div>
          <p className="text-[11px] text-[var(--fg-subtle)]">
            {activeIncidents.length === 0
              ? "All systems operational"
              : "Requires operator attention"}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--fg-muted)]">
            <span>TOTAL RECOVERED</span>
            <CheckCheck className="w-4 h-4 text-[var(--ok)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--fg)]">
            {resolvedCount}
          </div>
          <p className="text-[11px] text-[var(--fg-subtle)]">
            Rollbacks verified with health probes
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--fg-muted)]">
            <span>PROTECTED SERVICES</span>
            <Activity className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--fg)]">
            {svcList.length}
          </div>
          <p className="text-[11px] text-[var(--fg-subtle)]">
            Active health checks monitored
          </p>
        </div>
      </div>

      {/* Incidents Section */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--fg)]">
              Recent Incidents
            </h2>
            <p className="text-xs text-[var(--fg-muted)]">
              Deploys identified, suspect commits ranked, and actions verified
            </p>
          </div>
          <Link
            href="/app/incidents"
            className="text-xs font-mono text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {incidents.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-[var(--line)] rounded-lg">
            <Flame className="w-8 h-8 text-[var(--fg-subtle)] mx-auto opacity-50" />
            <div className="font-mono text-sm font-semibold text-[var(--fg)]">
              No fires detected.
            </div>
            <p className="text-xs text-[var(--fg-muted)] max-w-sm mx-auto">
              Simulate an incident using the fixtures CLI:{" "}
              <code className="text-[var(--accent)] font-mono">
                npm run fixture:fire
              </code>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {incidents.slice(0, 5).map((inc) => (
              <Link
                key={inc.id}
                href={`/app/incidents/${inc.id}`}
                className="flex items-center justify-between p-3.5 hover:bg-[var(--surface)] transition rounded-lg group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">
                      INC-{inc.number}
                    </span>
                    <span className="text-sm font-semibold text-[var(--fg)] group-hover:text-[var(--accent)] transition">
                      {inc.title}
                    </span>
                    <StatusPill status={inc.status} size="sm" />
                  </div>
                  <div className="text-xs text-[var(--fg-muted)] font-mono flex items-center gap-2">
                    <span>{inc.service.name}</span>
                    {inc.topSuspect && (
                      <span>
                        &bull; Suspect: {inc.topSuspect.shortSha} ({inc.topSuspect.message})
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs font-mono text-[var(--fg-muted)] flex items-center gap-3">
                  <span>{new Date(inc.openedAt).toLocaleTimeString()}</span>
                  <ArrowRight className="w-4 h-4 text-[var(--fg-subtle)] group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Services List Preview */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--fg)]">
              Configured Services
            </h2>
            <p className="text-xs text-[var(--fg-muted)]">
              Repositories and production branches protected by Firebreak
            </p>
          </div>
          <Link
            href="/app/services"
            className="text-xs font-mono text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <span>Manage services</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {svcList.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-[var(--fg-muted)] border border-dashed border-[var(--line)] rounded-lg">
            No services configured yet.{" "}
            <Link
              href="/app/services/new"
              className="text-[var(--accent)] hover:underline"
            >
              Add your first service &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {svcList.map((svc: (typeof svcList)[0]) => (
              <div
                key={svc.id}
                className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--line)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[var(--fg)]">
                    {svc.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--line)] text-[var(--ok)]">
                    Active
                  </span>
                </div>
                <div className="text-xs font-mono text-[var(--fg-muted)] space-y-1">
                  <div>Repo: {svc.repo_owner}/{svc.repo_name}</div>
                  <div className="truncate">Health: {svc.health_url}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
