import { withAuth, apiSuccess } from "@/lib/api";
import { proposeRollback } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const POST = withAuth(
  async (_req, { serviceCtx, user }, routeContext?: { params: Promise<{ id: string }> }) => {
    const { id } = await (routeContext?.params ?? Promise.resolve({ id: "" }));
    const result = await proposeRollback(serviceCtx, id, user.id);
    const status = result.proposed ? 201 : 200;
    return apiSuccess(result, status);
  },
);
