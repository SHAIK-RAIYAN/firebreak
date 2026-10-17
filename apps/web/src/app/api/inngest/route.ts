import { serve } from "inngest/next";
import { inngest } from "@firebreak/core";
import {
  incidentPipeline,
  incidentRetrace,
} from "@/inngest/functions/pipeline";

export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    incidentPipeline,
    incidentRetrace,
  ],
});
