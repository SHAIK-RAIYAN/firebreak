import { withAuth, apiSuccess } from "@/lib/api";
import { getAction } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(
  async (_req, { serviceCtx }, routeContext?: { params: Promise<{ id: string }> }) => {
    const { id } = await (routeContext?.params ?? Promise.resolve({ id: "" }));
    const action = await getAction(serviceCtx, id);
    return apiSuccess(action);
  },
);
