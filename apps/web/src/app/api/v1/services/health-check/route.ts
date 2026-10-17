import { withAuth, apiSuccess } from "@/lib/api";
import { checkHealthUrl } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (req, { serviceCtx }) => {
  const body = await req.json();
  const url = body.url;
  const result = await checkHealthUrl(serviceCtx, url);
  return apiSuccess(result);
});
