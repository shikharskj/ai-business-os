import { z } from "zod";

import { SEARCH_ENTITY_TYPES } from "@/modules/search/domain/types";
import { businessDateSchema } from "@/modules/shared-kernel/schemas";

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  type: z.enum(SEARCH_ENTITY_TYPES).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  from: businessDateSchema.optional(),
  to: businessDateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
