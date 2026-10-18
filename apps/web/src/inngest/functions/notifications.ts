import {
  inngest,
  sendWelcomeNotification,
  notifyIncidentOpened,
  notifyActionProposed,
  notifyActionVerified,
  notifyActionFailed,
} from "@firebreak/core";

export const notificationWelcome = inngest.createFunction(
  {
    id: "notification-welcome",
    triggers: { event: "user/created" },
    idempotency: "event.data.userId",
    retries: 3,
  },
  async ({ event, step }) => {
    return step.run("send-welcome-email", async () => {
      return sendWelcomeNotification({
        user: {
          id: event.data.userId,
          email: event.data.email,
          name: event.data.name,
        },
      });
    });
  },
);

export const notificationIncidentOpened = inngest.createFunction(
  {
    id: "notification-incident-opened",
    triggers: { event: "incident/opened" },
    idempotency: "event.data.incidentId",
    retries: 3,
  },
  async ({ event, step }) => {
    return step.run("send-incident-opened-emails", async () => {
      return notifyIncidentOpened({
        incidentId: event.data.incidentId,
        workspaceId: event.data.workspaceId,
      });
    });
  },
);

export const notificationActionProposed = inngest.createFunction(
  {
    id: "notification-action-proposed",
    triggers: { event: "action/proposed" },
    idempotency: "event.data.actionId",
    retries: 3,
  },
  async ({ event, step }) => {
    return step.run("send-action-proposed-emails", async () => {
      return notifyActionProposed({
        actionId: event.data.actionId,
        workspaceId: event.data.workspaceId,
      });
    });
  },
);

export const notificationActionVerified = inngest.createFunction(
  {
    id: "notification-action-verified",
    triggers: { event: "action/verified" },
    idempotency: "event.data.actionId",
    retries: 3,
  },
  async ({ event, step }) => {
    return step.run("send-action-verified-emails", async () => {
      return notifyActionVerified({
        actionId: event.data.actionId,
        workspaceId: event.data.workspaceId,
        streak: event.data.streak,
      });
    });
  },
);

export const notificationActionFailed = inngest.createFunction(
  {
    id: "notification-action-failed",
    triggers: { event: "action/failed" },
    idempotency: "event.data.actionId",
    retries: 3,
  },
  async ({ event, step }) => {
    return step.run("send-action-failed-emails", async () => {
      return notifyActionFailed({
        actionId: event.data.actionId,
        workspaceId: event.data.workspaceId,
        errorCode: event.data.errorCode,
        errorMessage: event.data.errorMessage,
      });
    });
  },
);
