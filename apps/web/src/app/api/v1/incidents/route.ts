import { withAuth, apiSuccess } from "@/lib/api";
import { listIncidents } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req, { serviceCtx }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "active" | "resolved" | "all" | null;
  const serviceId = url.searchParams.get("serviceId") ?? undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = url.searchParams.get("limit")
    ? parseInt(url.searchParams.get("limit")!, 10)
    : undefined;

  const result = await listIncidents(serviceCtx, {
    status: status ?? "active",
    serviceId,
    cursor,
    limit,
  });

  return apiSuccess(result);
});
