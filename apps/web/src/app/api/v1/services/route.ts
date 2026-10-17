import { withAuth, apiSuccess } from "@/lib/api";
import { listServices, createService } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { serviceCtx }) => {
  const services = await listServices(serviceCtx);
  return apiSuccess({ services });
});

export const POST = withAuth(async (req, { serviceCtx }) => {
  const body = await req.json();
  const res = await createService(serviceCtx, body);
  return apiSuccess(res, 201);
});
