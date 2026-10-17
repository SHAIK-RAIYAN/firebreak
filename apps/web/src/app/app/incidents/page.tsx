import Link from "next/link";
import { requireSession } from "@/lib/session";
import {
  listIncidents,
  userCtx,
  type IncidentListItem,
  db,
  services as servicesTable,
} from "@firebreak/core";
import { eq } from "drizzle-orm";
import { StatusPill } from "@/components/ui/status-pill";
import { ArrowRight, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; service?: string }>;
}) {
  const { user, workspace } = await requireSession("/app/incidents");
  const ctx = userCtx(workspace.id, user.id);
  const params = await searchParams;

  const currentTab = params.status || "active";
  const selectedService = params.service || "";

  // Fetch available services for filter dropdown
  const allServices = await db()
    .select({ id: servicesTable.id, name: servicesTable.name })
    .from(servicesTable)
    .where(eq(servicesTable.workspace_id, workspace.id));

  // Determine query status
  const filterStatus =
    currentTab === "active"
      ? "active"
      : currentTab === "resolved"
      ? "resolved"
      : "all";

  let incidents: IncidentListItem[] = [];
  try {
    const res = await listIncidents(ctx, {
      status: filterStatus as "active" | "resolved" | "all",
      serviceId: selectedService || undefined,
      limit: 50,
    });
    incidents = res.items;
  } catch (err) {
    console.error("Failed to load incidents:", err);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">
            Incidents
          </h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Active and historical production mitigations and rollbacks
          </p>
        </div>
      </div>

      {/* Filter Bar: Tabs & Service selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--line)]">
        <div className="flex items-center gap-1 bg-[var(--surface)] p-1 rounded-lg border border-[var(--line)]">
          {[
            { id: "active", label: "Active" },
            { id: "resolved", label: "Resolved" },
            { id: "all", label: "All" },
          ].map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/app/incidents?status=${tab.id}${
                  selectedService ? `&service=${selectedService}` : ""
                }`}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  isActive
                    ? "bg-[var(--bg-raised)] text-[var(--fg)] shadow-xs"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {allServices.length > 0 && (
          <form className="flex items-center gap-2">
            <label htmlFor="service-filter" className="text-xs font-mono text-[var(--fg-muted)]">
              Service:
            </label>
            <select
              id="service-filter"
              defaultValue={selectedService}
              onChange={(e) => {
                const targetUrl = `/app/incidents?status=${currentTab}${
                  e.target.value ? `&service=${e.target.value}` : ""
                }`;
                window.location.href = targetUrl;
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--fg)] font-mono outline-none focus:border-[var(--accent)]"
            >
              <option value="">All Services</option>
              {allServices.map((svc: { id: string; name: string }) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name}
                </option>
              ))}
            </select>
          </form>
        )}
      </div>

      {/* Incidents Table / Cards */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] overflow-hidden shadow-xs">
        {incidents.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Flame className="w-8 h-8 text-[var(--fg-subtle)] mx-auto opacity-40" />
            <div className="font-mono text-sm font-semibold text-[var(--fg)]">
              {currentTab === "active"
                ? "No active incidents."
                : currentTab === "resolved"
                ? "Nothing resolved yet."
                : "No incidents recorded."}
            </div>
            <p className="text-xs text-[var(--fg-muted)]">
              {currentTab === "active"
                ? "Production is currently stable."
                : "All alerts will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {incidents.map((inc) => (
              <Link
                key={inc.id}
                href={`/app/incidents/${inc.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-[var(--surface)] transition group gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">
                      INC-{inc.number}
                    </span>
                    <span className="text-sm font-semibold text-[var(--fg)] group-hover:text-[var(--accent)] transition">
                      {inc.title}
                    </span>
                    <StatusPill status={inc.status} size="sm" />
                  </div>
                  <div className="text-xs text-[var(--fg-muted)] font-mono flex items-center gap-2 flex-wrap">
                    <span className="text-[var(--fg)]">{inc.service.name}</span>
                    <span>&bull;</span>
                    <span>Opened {new Date(inc.openedAt).toLocaleString()}</span>
                    {inc.topSuspect && (
                      <>
                        <span>&bull;</span>
                        <span className="text-[var(--accent)]">
                          Suspect {inc.topSuspect.shortSha} ({inc.topSuspect.message})
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-[var(--fg-muted)] self-end sm:self-center">
                  <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] uppercase">
                    {inc.severity}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[var(--fg-subtle)] group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
