import Image from "next/image";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { SignOutButton } from "@/components/app/sign-out-button";
import { listIncidents, userCtx, type IncidentListItem } from "@firebreak/core";

export const dynamic = "force-dynamic";

async function ActiveIncidentsList({ workspaceId, userId }: { workspaceId: string; userId: string }) {
  const ctx = userCtx(workspaceId, userId);
  let items: IncidentListItem[] = [];
  try {
    const res = await listIncidents(ctx, { status: "all", limit: 10 });
    items = res.items;
  } catch (err) {
    console.error("Failed to load incidents:", err);
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-xs font-mono text-[var(--fg-muted)] border border-dashed border-[var(--line)] rounded-lg">
        No incidents yet. Trigger an alert or use <code className="text-[var(--accent)]">npm run fixture:fire</code> to simulate one.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--line)]">
      {items.map((inc) => (
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
              <span className="text-xs px-2 py-0.5 rounded-full font-mono uppercase bg-[var(--surface)] border border-[var(--line)] text-[var(--fg-muted)]">
                {inc.status}
              </span>
            </div>
            <div className="text-xs text-[var(--fg-muted)] font-mono flex items-center gap-2">
              <span>Service: {inc.service.name}</span>
              {inc.topSuspect && (
                <span>&bull; Suspect: {inc.topSuspect.shortSha} ({inc.topSuspect.message})</span>
              )}
            </div>
          </div>
          <div className="text-right text-xs font-mono text-[var(--fg-muted)] flex items-center gap-2">
            <span>{new Date(inc.openedAt).toLocaleTimeString()}</span>
            <span className="text-[var(--fg-subtle)] group-hover:translate-x-0.5 transition">&rarr;</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function ConsolePage() {
  const { user, workspace } = await requireSession("/app");

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-[var(--line)] bg-[var(--bg-raised)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--ok)] shadow-[0_0_8px_var(--ok)]" />
          <span className="font-mono text-sm font-semibold tracking-tight">
            firebreak
          </span>
          <span className="text-[var(--line-strong)]">/</span>
          <span className="text-xs font-mono text-[var(--fg-muted)]">
            console
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name ?? "User"}
                width={24}
                height={24}
                unoptimized
                className="w-6 h-6 rounded-full border border-[var(--line)]"
              />
            )}
            <span className="font-medium text-[var(--fg)]">{user.name}</span>
            <span className="text-[var(--fg-subtle)] font-mono">
              ({user.email})
            </span>
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            Operator Console
          </h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Production incident mitigation & rollback system
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-3">
          <a
            href="/app/integrations"
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--line-strong)] text-[var(--fg)] rounded-lg text-sm font-medium hover:bg-[var(--line)] transition"
          >
            Manage Integrations &rarr;
          </a>
          <a
            href="/app/services/new"
            className="px-4 py-2 bg-[var(--accent-solid)] text-[var(--accent-fg)] rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            + New Service
          </a>
        </div>

        {/* Workspace Card */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--fg-subtle)]">
                Active Workspace
              </span>
              <h2 className="text-lg font-semibold mt-0.5">{workspace.name}</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/20 text-[var(--ok)] border border-emerald-900/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" />
              Connected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg">
              <span className="text-[var(--fg-subtle)] block mb-1">Workspace ID</span>
              <span className="text-[var(--accent)] font-semibold select-all">
                {workspace.id}
              </span>
            </div>

            <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg">
              <span className="text-[var(--fg-subtle)] block mb-1">Owner User ID</span>
              <span className="text-[var(--fg)] select-all">{workspace.owner_user_id}</span>
            </div>

            <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg">
              <span className="text-[var(--fg-subtle)] block mb-1">AI Mode</span>
              <span className="text-[var(--fg)] capitalize">{workspace.ai_mode}</span>
            </div>

            <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg">
              <span className="text-[var(--fg-subtle)] block mb-1">Incidents Handled</span>
              <span className="text-[var(--fg)] font-bold">{workspace.incident_seq}</span>
            </div>
          </div>
        </div>

        {/* Active Incidents Section */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-raised)] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div>
              <h2 className="text-lg font-bold">Recent & Active Incidents</h2>
              <p className="text-xs text-[var(--fg-muted)]">
                Live production alerts and rollback workflows
              </p>
            </div>
          </div>

          <ActiveIncidentsList workspaceId={workspace.id} userId={user.id} />
        </div>
      </main>
    </div>
  );
}
