import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import { AttentionTenantMismatchError } from "@/modules/business-state/domain/errors";
import type { AttentionItem } from "@/modules/business-state/domain/types";

const OPEN_ATTENTION_LIMIT = 200;

/**
 * Tenant-scoped open AttentionQueue, ranked by severity.
 * Caller must enforce authz (`report:read`) and pass the authorized tenantId.
 */
export async function listOpenAttention(input: {
  tenantId: string;
  attention: AttentionQueueRepository;
}): Promise<AttentionItem[]> {
  const items = await input.attention.listOpen(input.tenantId);
  for (const item of items) {
    if (item.tenantId !== input.tenantId) {
      throw new AttentionTenantMismatchError();
    }
  }
  return items.slice(0, OPEN_ATTENTION_LIMIT);
}
