import { withAuth, apiSuccess } from "@/lib/api";
import { revokeMcpKey } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const DELETE = withAuth(
  async (_req, { serviceCtx }, routeContext?: { params: Promise<{ id: string }> }) => {
    const { id } = await (routeContext?.params ?? Promise.resolve({ id: "" }));
    await revokeMcpKey(serviceCtx, id);
    return apiSuccess({ ok: true });
  },
);
