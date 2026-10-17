import { withAuth, apiSuccess } from "@/lib/api";
import { connectVercel, disconnectVercel } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const PUT = withAuth(async (req, { serviceCtx }) => {
  const body = await req.json();
  const res = await connectVercel(serviceCtx, {
    token: body.token,
    teamId: body.teamId,
  });
  return apiSuccess(res);
});

export const DELETE = withAuth(async (_req, { serviceCtx }) => {
  await disconnectVercel(serviceCtx);
  return apiSuccess({ connected: false });
});
