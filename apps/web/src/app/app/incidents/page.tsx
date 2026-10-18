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
import { ServiceFilterSelect } from "@/components/app/service-filter-select";

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

  // Determine query status
  const filterStatus =
    currentTab === "active"
      ? "active"
      : currentTab === "resolved"
      ? "resolved"
      : "all";

  // Fetch available services for filter dropdown and incidents list concurrently
  const [allServices, incidentsRes] = await Promise.all([
    db()
      .select({ id: servicesTable.id, name: servicesTable.name })
      .from(servicesTable)
      .where(eq(servicesTable.workspace_id, workspace.id)),
    listIncidents(ctx, {
      status: filterStatus as "active" | "resolved" | "all",
      serviceId: selectedService || undefined,
      limit: 50,
    }).catch((err) => {
      console.error("Failed to load incidents:", err);
      return { items: [] as IncidentListItem[], nextCursor: null };
    }),
  ]);

  const incidents: IncidentListItem[] = incidentsRes.items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-(--fg)">
            Incidents
          </h1>
          <p className="text-sm text-(--fg-muted)">
            Active and historical production mitigations and rollbacks
          </p>
        </div>
      </div>

      {/* Filter Bar: Tabs & Service selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-(--line)">
        <div className="flex items-center gap-1 bg-(--surface) p-1 rounded-lg border border-(--line)">
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
                    ? "bg-(--bg-raised) text-(--fg) shadow-xs"
                    : "text-(--fg-muted) hover:text-(--fg)"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {allServices.length > 0 && (
          <ServiceFilterSelect
            services={allServices}
            selectedService={selectedService}
            currentStatus={currentTab}
          />
        )}
      </div>

      {/* Incidents Table / Cards */}
      <div className="rounded-xl border border-(--line) bg-(--bg-raised) overflow-hidden shadow-xs">
        {incidents.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Flame className="w-8 h-8 text-(--fg-subtle) mx-auto opacity-40" />
            <div className="font-mono text-sm font-semibold text-(--fg)">
              {currentTab === "active"
                ? "No active incidents."
                : currentTab === "resolved"
                ? "Nothing resolved yet."
                : "No incidents recorded."}
            </div>
            <p className="text-xs text-(--fg-muted)">
              {currentTab === "active"
                ? "Production is currently stable."
                : "All alerts will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-(--line)">
            {incidents.map((inc) => (
              <Link
                key={inc.id}
                href={`/app/incidents/${inc.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-(--surface) transition group gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-(--accent)">
                      INC-{inc.number}
                    </span>
                    <span className="text-sm font-semibold text-(--fg) group-hover:text-(--accent) transition">
                      {inc.title}
                    </span>
                    <StatusPill status={inc.status} size="sm" />
                  </div>
                  <div className="text-xs text-(--fg-muted) font-mono flex items-center gap-2 flex-wrap">
                    <span className="text-(--fg)">{inc.service.name}</span>
                    <span>&bull;</span>
                    <span>Opened {new Date(inc.openedAt).toLocaleString()}</span>
                    {inc.topSuspect && (
                      <>
                        <span>&bull;</span>
                        <span className="text-(--accent)">
                          Suspect {inc.topSuspect.shortSha} ({inc.topSuspect.message})
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-(--fg-muted) self-end sm:self-center">
                  <span className="px-2 py-0.5 rounded bg-(--surface) border border-(--line) uppercase">
                    {inc.severity}
                  </span>
                  <ArrowRight className="w-4 h-4 text-(--fg-subtle) group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
