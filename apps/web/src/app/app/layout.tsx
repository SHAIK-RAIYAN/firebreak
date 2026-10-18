import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { countActiveIncidents, userCtx } from "@firebreak/core";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace } = await requireSession();
  const ctx = userCtx(workspace.id, user.id);

  let activeIncidentsCount = 0;
  try {
    activeIncidentsCount = await countActiveIncidents(ctx);
  } catch (err) {
    console.error("Failed to fetch active incidents count in layout:", err);
  }

  return (
    <QueryProvider>
      <AppShell
        workspaceName={workspace.name}
        userName={user.name || user.email || "Operator"}
        userEmail={user.email}
        userAvatar={user.image ?? undefined}
        activeIncidentsCount={activeIncidentsCount}
      >
        {children}
      </AppShell>
    </QueryProvider>
  );
}
