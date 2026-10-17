import { withAuth, apiSuccess } from "@/lib/api";
import { listMcpKeys, createMcpKey } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { serviceCtx }) => {
  const keys = await listMcpKeys(serviceCtx);
  return apiSuccess(keys);
});

export const POST = withAuth(async (req, { serviceCtx }) => {
  const body = await req.json();
  const res = await createMcpKey(serviceCtx, body);
  return apiSuccess(res, 201);
});
