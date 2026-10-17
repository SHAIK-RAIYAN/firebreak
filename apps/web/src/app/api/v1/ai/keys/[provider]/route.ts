import { withAuth, apiSuccess } from "@/lib/api";
import { saveAiKey, deleteAiKey, type ProviderId } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const POST = withAuth(
  async (req, { serviceCtx }, routeContext?: { params: Promise<{ provider: string }> }) => {
    const { provider } = await (routeContext?.params ?? Promise.resolve({ provider: "" }));
    const body = await req.json();
    const result = await saveAiKey(serviceCtx, provider as ProviderId, body);
    return apiSuccess(result);
  },
);

export const DELETE = withAuth(
  async (_req, { serviceCtx }, routeContext?: { params: Promise<{ provider: string }> }) => {
    const { provider } = await (routeContext?.params ?? Promise.resolve({ provider: "" }));
    const result = await deleteAiKey(serviceCtx, provider as ProviderId);
    return apiSuccess(result);
  },
);
