import { withAuth, apiSuccess } from "@/lib/api";
import { retraceIncident } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const POST = withAuth(
  async (_req, { serviceCtx }, routeContext?: { params: Promise<{ id: string }> }) => {
    const { id } = await (routeContext?.params ?? Promise.resolve({ id: "" }));
    await retraceIncident(serviceCtx, id);
    return apiSuccess({ ok: true });
  },
);
