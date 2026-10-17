import { withAuth, apiSuccess } from "@/lib/api";
import { getIncidentDetail } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(
  async (_req, { serviceCtx }, routeContext?: { params: Promise<{ id: string }> }) => {
    const { id } = await (routeContext?.params ?? Promise.resolve({ id: "" }));
    const detail = await getIncidentDetail(serviceCtx, id);
    return apiSuccess(detail);
  },
);
