import { withAuth, apiSuccess } from "@/lib/api";
import { listGithubRepos } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { serviceCtx }) => {
  const repos = await listGithubRepos(serviceCtx);
  return apiSuccess({ repos });
});
