import { eq, and } from "drizzle-orm";
import { db as defaultDb, type Database } from "../db/client.js";
import {
  user as userTable,
  workspace_members,
  incidents,
  services,
  actions,
  notification_preferences,
  type NotificationPreferences,
  type DeploymentRef,
} from "../db/schema.js";
import { sendEmail, type SendEmailResult } from "./client.js";
import {
  buildWelcomeEmail,
  buildIncidentOpenedEmail,
  buildActionProposedEmail,
  buildActionVerifiedEmail,
  buildActionFailedEmail,
} from "./templates/index.js";
import { newId } from "../util/ids.js";
import { logger } from "../util/logger.js";

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * Resolves workspace recipients who have email notifications enabled.
 * Enforces strict workspace and user isolation.
 */
export async function getWorkspaceRecipients(
  workspaceId: string,
  eventType: "opened" | "proposed" | "resolved",
  customDb?: Database,
): Promise<Array<{ userId: string; email: string; name: string }>> {
  const db = customDb ?? defaultDb();

  try {
    const rows = await db
      .select({
        userId: userTable.id,
        email: userTable.email,
        name: userTable.name,
        emailVerified: userTable.emailVerified,
        prefEmailEnabled: notification_preferences.email_enabled,
        prefOpened: notification_preferences.notify_incident_opened,
        prefProposed: notification_preferences.notify_action_proposed,
        prefResolved: notification_preferences.notify_action_resolved,
      })
      .from(workspace_members)
      .innerJoin(userTable, eq(workspace_members.user_id, userTable.id))
      .leftJoin(
        notification_preferences,
        and(
          eq(notification_preferences.workspace_id, workspaceId),
          eq(notification_preferences.user_id, userTable.id),
        ),
      )
      .where(eq(workspace_members.workspace_id, workspaceId));

    return rows
      .filter((row) => {
        if (!row.email) return false;

        // If user explicitly turned off emails
        if (row.prefEmailEnabled === false) return false;

        if (eventType === "opened" && row.prefOpened === false) return false;
        if (eventType === "proposed" && row.prefProposed === false) return false;
        if (eventType === "resolved" && row.prefResolved === false) return false;

        return true;
      })
      .map((row) => ({
        userId: row.userId,
        email: row.email,
        name: row.name || "Operator",
      }));
  } catch (err) {
    logger.error({ err, workspaceId }, "Failed to fetch workspace email recipients");
    return [];
  }
}

/**
 * Sends a welcome notification to a newly registered user.
 * Exactly one welcome email is delivered per user lifetime via idempotencyKey `welcome:${userId}`.
 */
export async function sendWelcomeNotification({
  user,
  customDb,
}: {
  user: { id: string; name?: string | null; email: string };
  customDb?: Database;
}): Promise<SendEmailResult> {
  const appUrl = getAppUrl();
  const { subject, html, text } = buildWelcomeEmail({
    userName: user.name || "Operator",
    userEmail: user.email,
    appUrl,
  });

  return sendEmail({
    to: user.email,
    subject,
    html,
    text,
    template: "welcome",
    idempotencyKey: `welcome:${user.id}`,
    userId: user.id,
    customDb,
  });
}

/**
 * Sends incident detected notifications to workspace operators.
 */
export async function notifyIncidentOpened({
  incidentId,
  workspaceId,
  customDb,
}: {
  incidentId: string;
  workspaceId: string;
  customDb?: Database;
}): Promise<SendEmailResult[]> {
  const db = customDb ?? defaultDb();
  const appUrl = getAppUrl();

  const [row] = await db
    .select({
      incident: incidents,
      service: services,
    })
    .from(incidents)
    .innerJoin(services, eq(incidents.service_id, services.id))
    .where(and(eq(incidents.id, incidentId), eq(incidents.workspace_id, workspaceId)))
    .limit(1);

  if (!row) {
    logger.warn({ incidentId, workspaceId }, "Incident or service not found for email dispatch");
    return [];
  }

  const recipients = await getWorkspaceRecipients(workspaceId, "opened", db);
  if (recipients.length === 0) {
    logger.info({ incidentId, workspaceId }, "No eligible email recipients for incident opened");
    return [];
  }

  const { subject, html, text } = buildIncidentOpenedEmail({
    incidentId,
    serviceName: row.service.name,
    severity: row.incident.severity || "high",
    summary: row.incident.title || "Health check or probe failure detected",
    appUrl,
  });

  const results: SendEmailResult[] = [];
  for (const recipient of recipients) {
    try {
      const res = await sendEmail({
        to: recipient.email,
        subject,
        html,
        text,
        template: "incident_opened",
        idempotencyKey: `incident_opened:${incidentId}:${recipient.userId}`,
        workspaceId,
        userId: recipient.userId,
        customDb: db,
      });
      results.push(res);
    } catch (err) {
      logger.error({ err, recipientEmail: recipient.email, incidentId }, "Failed to deliver incident opened email");
    }
  }

  return results;
}

/**
 * Sends rollback approval required notification to workspace operators.
 * Deep link points to the authenticated review console; never direct GET/link approval.
 */
export async function notifyActionProposed({
  actionId,
  workspaceId,
  customDb,
}: {
  actionId: string;
  workspaceId: string;
  customDb?: Database;
}): Promise<SendEmailResult[]> {
  const db = customDb ?? defaultDb();
  const appUrl = getAppUrl();

  const [row] = await db
    .select({
      action: actions,
      incident: incidents,
      service: services,
    })
    .from(actions)
    .innerJoin(incidents, eq(actions.incident_id, incidents.id))
    .innerJoin(services, eq(incidents.service_id, services.id))
    .where(and(eq(actions.id, actionId), eq(actions.workspace_id, workspaceId)))
    .limit(1);

  if (!row) {
    logger.warn({ actionId, workspaceId }, "Action or incident not found for proposed email dispatch");
    return [];
  }

  const recipients = await getWorkspaceRecipients(workspaceId, "proposed", db);
  if (recipients.length === 0) {
    logger.info({ actionId, workspaceId }, "No eligible email recipients for action proposed");
    return [];
  }

  const fromDep = row.action.from_deployment as DeploymentRef | null;
  const target = row.action.target_deployment as DeploymentRef | null;
  const suspectSha = fromDep?.sha || fromDep?.id || null;
  const targetSha = target?.sha || target?.id || null;
  const targetUrl = target?.url ? (target.url.startsWith("http") ? target.url : `https://${target.url}`) : null;

  const { subject, html, text } = buildActionProposedEmail({
    incidentId: row.incident.id,
    actionId: row.action.id,
    serviceName: row.service.name,
    suspectSha,
    suspectMessage: row.incident.title,
    targetSha,
    targetUrl,
    expiresAt: row.action.expires_at || new Date(Date.now() + 15 * 60 * 1000),
    appUrl,
  });

  const results: SendEmailResult[] = [];
  for (const recipient of recipients) {
    try {
      const res = await sendEmail({
        to: recipient.email,
        subject,
        html,
        text,
        template: "action_proposed",
        idempotencyKey: `action_proposed:${actionId}:${recipient.userId}`,
        workspaceId,
        userId: recipient.userId,
        customDb: db,
      });
      results.push(res);
    } catch (err) {
      logger.error({ err, recipientEmail: recipient.email, actionId }, "Failed to deliver action proposed email");
    }
  }

  return results;
}

/**
 * Sends rollback verified notification with health-probe metrics.
 */
export async function notifyActionVerified({
  actionId,
  workspaceId,
  streak = 3,
  customDb,
}: {
  actionId: string;
  workspaceId: string;
  streak?: number;
  customDb?: Database;
}): Promise<SendEmailResult[]> {
  const db = customDb ?? defaultDb();
  const appUrl = getAppUrl();

  const [row] = await db
    .select({
      action: actions,
      incident: incidents,
      service: services,
    })
    .from(actions)
    .innerJoin(incidents, eq(actions.incident_id, incidents.id))
    .innerJoin(services, eq(incidents.service_id, services.id))
    .where(and(eq(actions.id, actionId), eq(actions.workspace_id, workspaceId)))
    .limit(1);

  if (!row) {
    logger.warn({ actionId, workspaceId }, "Action or incident not found for verified email dispatch");
    return [];
  }

  const recipients = await getWorkspaceRecipients(workspaceId, "resolved", db);
  if (recipients.length === 0) {
    logger.info({ actionId, workspaceId }, "No eligible email recipients for action verified");
    return [];
  }

  const target = row.action.target_deployment as DeploymentRef | null;
  const targetSha = target?.sha || target?.id || null;

  const { subject, html, text } = buildActionVerifiedEmail({
    incidentId: row.incident.id,
    actionId: row.action.id,
    serviceName: row.service.name,
    targetSha,
    streak,
    appUrl,
  });

  const results: SendEmailResult[] = [];
  for (const recipient of recipients) {
    try {
      const res = await sendEmail({
        to: recipient.email,
        subject,
        html,
        text,
        template: "action_verified",
        idempotencyKey: `action_verified:${actionId}:${recipient.userId}`,
        workspaceId,
        userId: recipient.userId,
        customDb: db,
      });
      results.push(res);
    } catch (err) {
      logger.error({ err, recipientEmail: recipient.email, actionId }, "Failed to deliver action verified email");
    }
  }

  return results;
}

/**
 * Sends rollback failed / verification failed notification.
 */
export async function notifyActionFailed({
  actionId,
  workspaceId,
  errorCode,
  errorMessage,
  customDb,
}: {
  actionId: string;
  workspaceId: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  customDb?: Database;
}): Promise<SendEmailResult[]> {
  const db = customDb ?? defaultDb();
  const appUrl = getAppUrl();

  const [row] = await db
    .select({
      action: actions,
      incident: incidents,
      service: services,
    })
    .from(actions)
    .innerJoin(incidents, eq(actions.incident_id, incidents.id))
    .innerJoin(services, eq(incidents.service_id, services.id))
    .where(and(eq(actions.id, actionId), eq(actions.workspace_id, workspaceId)))
    .limit(1);

  if (!row) {
    logger.warn({ actionId, workspaceId }, "Action or incident not found for failed email dispatch");
    return [];
  }

  const recipients = await getWorkspaceRecipients(workspaceId, "resolved", db);
  if (recipients.length === 0) {
    logger.info({ actionId, workspaceId }, "No eligible email recipients for action failed");
    return [];
  }

  const { subject, html, text } = buildActionFailedEmail({
    incidentId: row.incident.id,
    actionId: row.action.id,
    serviceName: row.service.name,
    errorCode: errorCode || row.action.error_code,
    errorMessage: errorMessage || row.action.error_message,
    appUrl,
  });

  const results: SendEmailResult[] = [];
  for (const recipient of recipients) {
    try {
      const res = await sendEmail({
        to: recipient.email,
        subject,
        html,
        text,
        template: "action_failed",
        idempotencyKey: `action_failed:${actionId}:${recipient.userId}`,
        workspaceId,
        userId: recipient.userId,
        customDb: db,
      });
      results.push(res);
    } catch (err) {
      logger.error({ err, recipientEmail: recipient.email, actionId }, "Failed to deliver action failed email");
    }
  }

  return results;
}

/**
 * Retrieve or default notification preferences for a user in a workspace.
 */
export async function getNotificationPreferences(
  userId: string,
  workspaceId: string,
  customDb?: Database,
): Promise<NotificationPreferences> {
  const db = customDb ?? defaultDb();

  const [existing] = await db
    .select()
    .from(notification_preferences)
    .where(
      and(
        eq(notification_preferences.user_id, userId),
        eq(notification_preferences.workspace_id, workspaceId),
      ),
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  return {
    id: `np_default_${userId}`,
    user_id: userId,
    workspace_id: workspaceId,
    email_enabled: true,
    notify_incident_opened: true,
    notify_action_proposed: true,
    notify_action_resolved: true,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Upsert notification preferences for a user in a workspace.
 */
export async function updateNotificationPreferences(
  userId: string,
  workspaceId: string,
  updates: Partial<Pick<NotificationPreferences, "email_enabled" | "notify_incident_opened" | "notify_action_proposed" | "notify_action_resolved">>,
  customDb?: Database,
): Promise<NotificationPreferences> {
  const db = customDb ?? defaultDb();
  const currentTime = new Date();

  const [existing] = await db
    .select()
    .from(notification_preferences)
    .where(
      and(
        eq(notification_preferences.user_id, userId),
        eq(notification_preferences.workspace_id, workspaceId),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(notification_preferences)
      .set({
        ...updates,
        updated_at: currentTime,
      })
      .where(eq(notification_preferences.id, existing.id))
      .returning();
    if (updated) return updated;
    return { ...existing, ...updates, updated_at: currentTime };
  }

  const newIdVal = newId("np");
  const [created] = await db
    .insert(notification_preferences)
    .values({
      id: newIdVal,
      user_id: userId,
      workspace_id: workspaceId,
      email_enabled: updates.email_enabled ?? true,
      notify_incident_opened: updates.notify_incident_opened ?? true,
      notify_action_proposed: updates.notify_action_proposed ?? true,
      notify_action_resolved: updates.notify_action_resolved ?? true,
      created_at: currentTime,
      updated_at: currentTime,
    })
    .returning();

  if (created) return created;
  return {
    id: newIdVal,
    user_id: userId,
    workspace_id: workspaceId,
    email_enabled: updates.email_enabled ?? true,
    notify_incident_opened: updates.notify_incident_opened ?? true,
    notify_action_proposed: updates.notify_action_proposed ?? true,
    notify_action_resolved: updates.notify_action_resolved ?? true,
    created_at: currentTime,
    updated_at: currentTime,
  };
}
