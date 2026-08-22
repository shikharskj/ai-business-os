import { recordAutomationOutcome } from "@/modules/business-state/application/record-outcome";
import {
  expenseAnomalyFlaggedIdempotencyKey,
  idleQuotationNaturalKey,
  lowStockNaturalKey,
  quotationFollowUpProposedIdempotencyKey,
  reorderPreparedIdempotencyKey,
  unusualExpenseNaturalKey,
} from "@/modules/business-state/domain/attention-keys";
import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import type { AutomationOutcomeKind } from "@/modules/business-state/domain/types";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";

async function recordKeyedOutcome(input: {
  tenantId: string;
  kind: AutomationOutcomeKind;
  idempotencyKey: string;
  naturalKey: string;
  resourceType: string;
  resourceId: string;
  payload?: Record<string, unknown>;
  attention: AttentionQueueRepository;
  outbox?: OutboxRepository;
}): Promise<void> {
  const attentionItem = await input.attention.findByNaturalKey(
    input.tenantId,
    input.naturalKey
  );
  await recordAutomationOutcome({
    tenantId: input.tenantId,
    kind: input.kind,
    idempotencyKey: input.idempotencyKey,
    attentionItemId: attentionItem?.id ?? null,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    payload: input.payload ?? {},
    attention: input.attention,
    outbox: input.outbox,
  });
}

export async function recordQuotationFollowUpProposed(input: {
  tenantId: string;
  quotationId: string;
  asOf: string;
  payload?: Record<string, unknown>;
  attention: AttentionQueueRepository;
  outbox?: OutboxRepository;
}): Promise<void> {
  await recordKeyedOutcome({
    tenantId: input.tenantId,
    kind: "QUOTATION_FOLLOW_UP_PROPOSED",
    idempotencyKey: quotationFollowUpProposedIdempotencyKey(
      input.quotationId,
      input.asOf
    ),
    naturalKey: idleQuotationNaturalKey(input.quotationId),
    resourceType: "Quotation",
    resourceId: input.quotationId,
    payload: input.payload,
    attention: input.attention,
    outbox: input.outbox,
  });
}

export async function recordReorderPrepared(input: {
  tenantId: string;
  productId: string;
  asOf: string;
  payload?: Record<string, unknown>;
  attention: AttentionQueueRepository;
  outbox?: OutboxRepository;
}): Promise<void> {
  await recordKeyedOutcome({
    tenantId: input.tenantId,
    kind: "REORDER_PREPARED",
    idempotencyKey: reorderPreparedIdempotencyKey(input.productId, input.asOf),
    naturalKey: lowStockNaturalKey(input.productId),
    resourceType: "Product",
    resourceId: input.productId,
    payload: input.payload,
    attention: input.attention,
    outbox: input.outbox,
  });
}

export async function recordExpenseAnomalyFlagged(input: {
  tenantId: string;
  expenseId: string;
  payload?: Record<string, unknown>;
  attention: AttentionQueueRepository;
  outbox?: OutboxRepository;
}): Promise<void> {
  await recordKeyedOutcome({
    tenantId: input.tenantId,
    kind: "EXPENSE_ANOMALY_FLAGGED",
    idempotencyKey: expenseAnomalyFlaggedIdempotencyKey(input.expenseId),
    naturalKey: unusualExpenseNaturalKey(input.expenseId),
    resourceType: "Expense",
    resourceId: input.expenseId,
    payload: input.payload,
    attention: input.attention,
    outbox: input.outbox,
  });
}
