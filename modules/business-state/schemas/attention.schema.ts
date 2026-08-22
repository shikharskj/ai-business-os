import { z } from "zod";

export const dismissAttentionSchema = z.object({
  attentionItemId: z.string().min(1),
});

export type DismissAttentionInput = z.infer<typeof dismissAttentionSchema>;

export const listCollectionsOutcomesQuerySchema = z.object({
  invoiceId: z.string().min(1).optional(),
});

export type ListCollectionsOutcomesQuery = z.infer<
  typeof listCollectionsOutcomesQuerySchema
>;
