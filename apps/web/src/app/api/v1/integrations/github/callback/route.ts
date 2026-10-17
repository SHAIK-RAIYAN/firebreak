import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { completeGithubInstall, reasonOf } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req, { serviceCtx }) => {
  const url = new URL(req.url);
  const installationIdStr = url.searchParams.get("installation_id");
  const code = url.searchParams.get("code") || undefined;
  const state = url.searchParams.get("state") || undefined;

  if (installationIdStr) {
    const installationId = Number(installationIdStr);
    try {
      await completeGithubInstall(serviceCtx, {
        installationId,
        code,
        state,
      });
      return NextResponse.redirect(new URL("/app/integrations?connected=github", req.url), {
        status: 302,
      });
    } catch (err) {
      const reason = reasonOf(err) || "github_failed";
      return NextResponse.redirect(
        new URL(`/app/integrations?error=${encodeURIComponent(reason)}`, req.url),
        { status: 302 },
      );
    }
  }

  // Missing installation_id
  if (!code) {
    return NextResponse.redirect(
      new URL("/app/integrations?error=reconnect", req.url),
      { status: 302 },
    );
  }

  return NextResponse.redirect(
    new URL("/app/integrations?link=1", req.url),
    { status: 302 },
  );
});
