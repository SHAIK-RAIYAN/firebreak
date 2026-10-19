import { z } from "@nitrostack/core";

export const ProposeRollbackInput = z.object({
  incident: z
    .union([z.string().min(1), z.number()])
    .transform((v) => String(v))
    .describe("Incident id (inc_…) or number (e.g. 1, 12, or INC-12)"),
});
export type ProposeRollbackInput = z.infer<typeof ProposeRollbackInput>;

export const GetActionStatusInput = z
  .object({
    action: z.string().optional().describe("Action ID (act_…)"),
    incident: z
      .union([z.string().min(1), z.number()])
      .transform((v) => String(v))
      .optional()
      .describe("Incident id (inc_…) or number (e.g. 1, 12, or INC-12)"),
  })
  .refine((data) => data.action || data.incident, {
    message: "Either action or incident must be provided",
  });
export type GetActionStatusInput = z.infer<typeof GetActionStatusInput>;


export const ApproveActionInput = z.object({
  action: z.string().min(1).describe("Action ID (act_…) to approve"),
  note: z.string().max(200).optional().describe("Optional approval note"),
});
export type ApproveActionInput = z.infer<typeof ApproveActionInput>;
