import Link from "next/link";
import { requireSession } from "@/lib/session";
import {
  db,
  services as servicesTable,
  incidents as incidentsTable,
} from "@firebreak/core";
import { eq, and, inArray } from "drizzle-orm";
import { PlusCircle, Layers, ExternalLink, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const { workspace } = await requireSession("/app/services");

  // Fetch all services for the workspace
  const svcList = await db()
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.workspace_id, workspace.id));

  // Find which services currently have active incidents
  const activeIncidents = await db()
    .select({
      serviceId: incidentsTable.service_id,
      incidentId: incidentsTable.id,
      number: incidentsTable.number,
      status: incidentsTable.status,
    })
    .from(incidentsTable)
    .where(
      and(
        eq(incidentsTable.workspace_id, workspace.id),
        inArray(incidentsTable.status, [
          "open",
          "triaged",
          "awaiting_approval",
          "mitigating",
          "verifying",
        ]),
      ),
    );

  const activeByService = new Map<string, typeof activeIncidents[0]>();
  for (const inc of activeIncidents) {
    if (!activeByService.has(inc.serviceId)) {
      activeByService.set(inc.serviceId, inc);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">
            Services
          </h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Applications monitored by Firebreak with automated rollback capability
          </p>
        </div>
        <Link
          href="/app/services/new"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-solid)] text-[var(--accent-fg)] rounded-lg text-xs font-semibold hover:brightness-110 transition shadow-xs self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Service</span>
        </Link>
      </div>

      {/* Services List / Cards */}
      {svcList.length === 0 ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-12 text-center space-y-3">
          <Layers className="w-10 h-10 text-[var(--fg-subtle)] mx-auto opacity-50" />
          <h2 className="text-base font-semibold text-[var(--fg)]">
            No services configured
          </h2>
          <p className="text-xs text-[var(--fg-muted)] max-w-sm mx-auto">
            Connect a GitHub repository and Vercel project to enable automated incident response.
          </p>
          <div className="pt-2">
            <Link
              href="/app/services/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-solid)] text-[var(--accent-fg)] rounded-lg text-xs font-semibold hover:brightness-110 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create your first service</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {svcList.map((svc: (typeof svcList)[0]) => {
            const activeInc = activeByService.get(svc.id);
            return (
              <div
                key={svc.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-5 space-y-4 hover:border-[var(--line-strong)] transition shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top line: Name & Status Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-[var(--fg)]">
                      {svc.name}
                    </h2>
                    {activeInc ? (
                      <Link
                        href={`/app/incidents/${activeInc.incidentId}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:brightness-110 transition animate-pulse"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>INC-{activeInc.number} active</span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-[var(--ok)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" />
                        <span>Protected</span>
                      </span>
                    )}
                  </div>

                  {/* Metadata fields */}
                  <div className="space-y-2 font-mono text-xs text-[var(--fg-muted)]">
                    <div className="flex items-center justify-between py-1 border-b border-[var(--line)]/50">
                      <span className="text-[var(--fg-subtle)]">Repository:</span>
                      <a
                        href={`https://github.com/${svc.repo_owner}/${svc.repo_name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--fg)] hover:text-[var(--accent)] flex items-center gap-1"
                      >
                        <span>{svc.repo_owner}/{svc.repo_name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[var(--line)]/50">
                      <span className="text-[var(--fg-subtle)]">Production Branch:</span>
                      <span className="text-[var(--fg)]">{svc.production_branch}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[var(--line)]/50">
                      <span className="text-[var(--fg-subtle)]">Vercel Project:</span>
                      <span className="text-[var(--fg)]">{svc.vercel_project_name}</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[var(--fg-subtle)]">Health Check:</span>
                      <a
                        href={svc.health_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent)] truncate max-w-[200px] hover:underline"
                        title={svc.health_url}
                      >
                        {svc.health_url}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--fg-subtle)]">
                    ID: {svc.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--fg-muted)]">
                      Expected HTTP {svc.health_expected_status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
