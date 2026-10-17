import { z } from "zod";

export const IncidentOpenedSchema = z.object({
  incidentId: z.string(),
  workspaceId: z.string(),
});
export type IncidentOpenedData = z.infer<typeof IncidentOpenedSchema>;

export const IncidentRetraceSchema = z.object({
  incidentId: z.string(),
  workspaceId: z.string(),
});
export type IncidentRetraceData = z.infer<typeof IncidentRetraceSchema>;

export const IncidentTracedSchema = z.object({
  incidentId: z.string(),
  workspaceId: z.string(),
  hasTarget: z.boolean(),
});
export type IncidentTracedData = z.infer<typeof IncidentTracedSchema>;

export const IncidentAnalysisRequestedSchema = z.object({
  incidentId: z.string(),
  workspaceId: z.string(),
  attempt: z.number().int().optional(),
});
export type IncidentAnalysisRequestedData = z.infer<typeof IncidentAnalysisRequestedSchema>;

export const ActionProposedSchema = z.object({
  actionId: z.string(),
  workspaceId: z.string(),
  expiresAt: z.string(),
});
export type ActionProposedData = z.infer<typeof ActionProposedSchema>;

export const ActionApprovedSchema = z.object({
  actionId: z.string(),
  workspaceId: z.string(),
});
export type ActionApprovedData = z.infer<typeof ActionApprovedSchema>;

export type FirebreakEvents = {
  "incident/opened": { data: IncidentOpenedData };
  "incident/retrace": { data: IncidentRetraceData };
  "incident/traced": { data: IncidentTracedData };
  "incident/analysis.requested": { data: IncidentAnalysisRequestedData };
  "action/proposed": { data: ActionProposedData };
  "action/approved": { data: ActionApprovedData };
};
