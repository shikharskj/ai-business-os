import { z } from "zod";

import { createPartyInputSchema, partySearchSchema } from "@/modules/party/schemas/party.schema";

export const supplierInputSchema = createPartyInputSchema(
  "Supplier name is required"
);

export type SupplierFormInput = z.infer<typeof supplierInputSchema>;

export const supplierSearchSchema = partySearchSchema;
