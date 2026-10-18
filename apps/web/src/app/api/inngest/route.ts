import { serve } from "inngest/next";
import { inngest } from "@firebreak/core";
import {
  incidentPipeline,
  incidentRetrace,
} from "@/inngest/functions/pipeline";
import {
  actionExecute,
  actionExpiry,
} from "@/inngest/functions/actions";
import { incidentAnalysis } from "@/inngest/functions/analysis";
import {
  notificationWelcome,
  notificationIncidentOpened,
  notificationActionProposed,
  notificationActionVerified,
  notificationActionFailed,
} from "@/inngest/functions/notifications";

export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    incidentPipeline,
    incidentRetrace,
    actionExecute,
    actionExpiry,
    incidentAnalysis,
    notificationWelcome,
    notificationIncidentOpened,
    notificationActionProposed,
    notificationActionVerified,
    notificationActionFailed,
  ],
});

