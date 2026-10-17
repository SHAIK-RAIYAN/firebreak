import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { startGithubInstall } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { serviceCtx }) => {
  const url = await startGithubInstall(serviceCtx);
  return NextResponse.redirect(url, { status: 302 });
});
