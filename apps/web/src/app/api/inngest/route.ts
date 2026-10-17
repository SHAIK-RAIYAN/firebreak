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

export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    incidentPipeline,
    incidentRetrace,
    actionExecute,
    actionExpiry,
  ],
});
