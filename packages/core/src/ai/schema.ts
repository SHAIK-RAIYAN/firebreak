import { z } from "zod";

export const AnalysisSchema = z.object({
  summary: z.string().min(1).max(400),
  likelyCause: z.object({
    suspectId: z.string().nullable(),
    explanation: z.string().max(800),
    evidenceIds: z.array(z.string()).max(8),
  }),
  confidence: z.enum(["low", "medium", "high"]),
  fixSuggestions: z.array(
    z.object({
      title: z.string().max(120),
      file: z.string().nullable(),
      description: z.string().max(600),
      patch: z.string().max(2000).nullable(),
    }),
  ).max(3),
  rollbackAssessment: z.object({
    agrees: z.boolean(),
    reason: z.string().max(300),
  }),
  unknowns: z.array(z.string().max(200)).max(5),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
