import { withAuth, apiSuccess } from "@/lib/api";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@firebreak/core";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { user, workspace }) => {
  const prefs = await getNotificationPreferences(user.id, workspace.id);
  return apiSuccess(prefs);
});

export const PUT = withAuth(async (req, { user, workspace }) => {
  const body = await req.json();
  const updated = await updateNotificationPreferences(user.id, workspace.id, {
    email_enabled: typeof body.email_enabled === "boolean" ? body.email_enabled : undefined,
    notify_incident_opened: typeof body.notify_incident_opened === "boolean" ? body.notify_incident_opened : undefined,
    notify_action_proposed: typeof body.notify_action_proposed === "boolean" ? body.notify_action_proposed : undefined,
    notify_action_resolved: typeof body.notify_action_resolved === "boolean" ? body.notify_action_resolved : undefined,
  });
  return apiSuccess(updated);
});
