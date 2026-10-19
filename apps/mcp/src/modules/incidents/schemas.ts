import { z } from "@nitrostack/core";

export const ListIncidentsInput = z.object({
  status: z.enum(["active", "resolved", "all"]).default("active").optional(),
  serviceId: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(10).optional(),
});
export type ListIncidentsInput = z.infer<typeof ListIncidentsInput>;

export const IncidentRefSchema = z
  .union([z.string().min(1), z.number()])
  .transform((v) => String(v))
  .describe("Incident id (inc_…) or number (e.g. 1, 12, or INC-12)");

export const GetIncidentInput = z.object({
  incident: IncidentRefSchema,
});
export type GetIncidentInput = z.infer<typeof GetIncidentInput>;

export const GetSuspectsInput = z.object({
  incident: IncidentRefSchema,
  limit: z.number().int().min(1).max(10).default(5).optional(),
});
export type GetSuspectsInput = z.infer<typeof GetSuspectsInput>;

export const GetAnalysisInput = z.object({
  incident: IncidentRefSchema,
});
export type GetAnalysisInput = z.infer<typeof GetAnalysisInput>;

export const GetTimelineInput = z.object({
  incident: IncidentRefSchema,
  limit: z.number().int().min(1).max(50).default(20).optional(),
});
export type GetTimelineInput = z.infer<typeof GetTimelineInput>;

