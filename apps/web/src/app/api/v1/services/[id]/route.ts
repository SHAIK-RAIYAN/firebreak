import { withAuth, apiSuccess } from "@/lib/api";
import { getService, updateService, archiveService } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { serviceCtx }, routeContext?: { params: Promise<{ id: string }> }) => {
  const { id } = await (routeContext?.params ?? Promise.resolve({ id: "" }));
  const service = await getService(serviceCtx, id);
  return apiSuccess({ service });
});

export const PATCH = withAuth(async (req, { serviceCtx }, routeContext?: { params: Promise<{ id: string }> }) => {
  const { id } = await (routeContext?.params ?? Promise.resolve({ id: "" }));
  const body = await req.json();
  const service = await updateService(serviceCtx, id, body);
  return apiSuccess({ service });
});

export const DELETE = withAuth(async (_req, { serviceCtx }, routeContext?: { params: Promise<{ id: string }> }) => {
  const { id } = await (routeContext?.params ?? Promise.resolve({ id: "" }));
  await archiveService(serviceCtx, id);
  return apiSuccess({ ok: true });
});
