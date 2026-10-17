import { z } from "@nitrostack/core";

export const ListIncidentsInput = z.object({
  status: z.enum(["active", "resolved", "all"]).default("active").optional(),
  serviceId: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(10).optional(),
});
export type ListIncidentsInput = z.infer<typeof ListIncidentsInput>;

export const GetIncidentInput = z.object({
  incident: z
    .string()
    .min(1)
    .describe("Incident id (inc_…) or number (e.g. 12 or INC-12)"),
});
export type GetIncidentInput = z.infer<typeof GetIncidentInput>;

export const GetSuspectsInput = z.object({
  incident: z
    .string()
    .min(1)
    .describe("Incident id (inc_…) or number (e.g. 12 or INC-12)"),
  limit: z.number().int().min(1).max(10).default(5).optional(),
});
export type GetSuspectsInput = z.infer<typeof GetSuspectsInput>;

export const GetAnalysisInput = z.object({
  incident: z
    .string()
    .min(1)
    .describe("Incident id (inc_…) or number (e.g. 12 or INC-12)"),
});
export type GetAnalysisInput = z.infer<typeof GetAnalysisInput>;

export const GetTimelineInput = z.object({
  incident: z
    .string()
    .min(1)
    .describe("Incident id (inc_…) or number (e.g. 12 or INC-12)"),
  limit: z.number().int().min(1).max(50).default(20).optional(),
});
export type GetTimelineInput = z.infer<typeof GetTimelineInput>;
