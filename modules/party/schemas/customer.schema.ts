import { z } from "zod";

import { createPartyInputSchema, partySearchSchema } from "@/modules/party/schemas/party.schema";

export const customerInputSchema = createPartyInputSchema(
  "Customer name is required"
);

export type CustomerFormInput = z.infer<typeof customerInputSchema>;

export const customerSearchSchema = partySearchSchema;
