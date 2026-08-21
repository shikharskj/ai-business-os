import { z } from "zod";

export const dismissAttentionSchema = z.object({
  attentionItemId: z.string().min(1),
});

export type DismissAttentionInput = z.infer<typeof dismissAttentionSchema>;
