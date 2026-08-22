import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import type {
  AutomationOutcome,
  AutomationOutcomeKind,
} from "@/modules/business-state/domain/types";

export const COLLECTIONS_OUTCOME_KINDS = [
  "REMINDER_PROPOSED",
  "REMINDER_SENT",
  "PAID_AFTER_REMINDER",
] as const satisfies readonly AutomationOutcomeKind[];

/**
 * Learning-hook query for collections: proposed/sent reminders and paid-after
 * follow-up, tenant-scoped. Caller enforces authz (`report:read`).
 */
export async function listCollectionsOutcomes(input: {
  tenantId: string;
  invoiceId?: string;
  attention: AttentionQueueRepository;
}): Promise<AutomationOutcome[]> {
  return input.attention.listOutcomes({
    tenantId: input.tenantId,
    kinds: [...COLLECTIONS_OUTCOME_KINDS],
    resourceType: "SalesInvoice",
    resourceIds: input.invoiceId ? [input.invoiceId] : undefined,
  });
}
