import { withAuth, apiSuccess } from "@/lib/api";
import { listIntegrations } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { serviceCtx }) => {
  const data = await listIntegrations(serviceCtx);
  return apiSuccess(data);
});
