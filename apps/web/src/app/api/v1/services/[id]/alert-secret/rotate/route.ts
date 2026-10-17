import { withAuth, apiSuccess } from "@/lib/api";
import { rotateAlertSecret } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const POST = withAuth(
  async (_req, { serviceCtx }, routeContext?: { params: Promise<{ id: string }> }) => {
    const { id } = await (routeContext?.params ?? Promise.resolve({ id: "" }));
    const res = await rotateAlertSecret(serviceCtx, id);
    return apiSuccess(res);
  },
);
