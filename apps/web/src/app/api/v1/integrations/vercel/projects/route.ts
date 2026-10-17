import { withAuth, apiSuccess } from "@/lib/api";
import { listVercelProjects } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { serviceCtx }) => {
  const projects = await listVercelProjects(serviceCtx);
  return apiSuccess({ projects });
});
