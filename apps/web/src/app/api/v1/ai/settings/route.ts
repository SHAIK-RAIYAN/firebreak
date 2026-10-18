import { withAuth, apiSuccess } from "@/lib/api";
import { getAiSettings, updateAiSettings } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { serviceCtx }) => {
  const settings = await getAiSettings(serviceCtx);
  return apiSuccess({
    ...settings,
    dailyQuotaRemaining: settings.quota?.remaining ?? 20,
    dailyQuotaLimit: settings.quota?.limit ?? 20,
  });
});

export const PUT = withAuth(async (req, { serviceCtx }) => {
  const body = await req.json();
  const updated = await updateAiSettings(serviceCtx, body);
  return apiSuccess({
    ...updated,
    dailyQuotaRemaining: updated.quota?.remaining ?? 20,
    dailyQuotaLimit: updated.quota?.limit ?? 20,
  });
});

