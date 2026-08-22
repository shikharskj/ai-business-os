import { z } from "zod";

export const proposeBriefReminderSchema = z
  .object({
    attentionItemId: z.string().min(1).max(200),
  })
  .strict();

export type ProposeBriefReminderBody = z.infer<
  typeof proposeBriefReminderSchema
>;
