import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { workspacesRepo, type Workspace } from "@firebreak/core";

export type SessionContext = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
  workspace: Workspace;
};

/**
 * Get the current session and workspace if authenticated, or null.
 * Wrapped in React cache() to deduplicate session and workspace resolution
 * across layouts, pages, and server components during a single request lifecycle.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session) {
    return null;
  }

  // Idempotently ensure the user has a personal workspace
  const workspace = await workspacesRepo.bootstrapPersonalWorkspace(
    session.user.id,
    session.user.name,
  );

  return {
    user: session.user,
    session: session.session,
    workspace,
  };
});

/**
 * Require a valid session. Redirects to /login if unauthenticated.
 */
export async function requireSession(redirectTo?: string): Promise<SessionContext> {
  const ctx = await getSession();
  if (!ctx) {
    const dest = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
    redirect(dest);
  }
  return ctx;
}
