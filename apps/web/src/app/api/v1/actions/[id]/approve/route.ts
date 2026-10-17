import { withAuth, apiSuccess } from "@/lib/api";
import { approveAction } from "@firebreak/core";

export const dynamic = "force-dynamic";

export const POST = withAuth(
  async (req, { serviceCtx }, routeContext?: { params: Promise<{ id: string }> }) => {
    const { id } = await (routeContext?.params ?? Promise.resolve({ id: "" }));
    let note: string | undefined;
    try {
      const body = await req.json();
      note = body?.note;
    } catch {
      // Empty body allowed
    }
    const action = await approveAction(serviceCtx, id, { note, via: "web" });
    return apiSuccess({ action });
  },
);
