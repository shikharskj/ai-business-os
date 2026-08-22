import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import type { OutboxEventRecord } from "@/modules/events/domain/types";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { enqueueWorkflowRun } from "@/modules/workflows/application/enqueue-run";
import { getWorkflow } from "@/modules/workflows/application/registry";
import { reorderPrepareIdempotencyKey } from "@/modules/workflows/domain/expansion-keys";
import { REORDER_PREPARE_WORKFLOW_ID } from "@/modules/workflows/domain/types";
import type { WorkflowRunRepository } from "@/modules/workflows/infrastructure/workflow-run-repository";

export type LowStockForReorder = {
  id: string;
  productName: string;
  sku: string;
  quantityMajor: string;
  unitOfMeasurement: string;
  thresholdMajor: string;
};

/**
 * Emits one StockLow catalog event per still-low product for the business
 * day, then enqueues inventory.reorder.
 */
export async function emitStockLowEvents(input: {
  tenantId: string;
  asOf: string;
  products: readonly LowStockForReorder[];
  outbox: OutboxRepository;
  runs: WorkflowRunRepository;
}): Promise<{ emitted: number; skipped: number }> {
  const workflow = getWorkflow(REORDER_PREPARE_WORKFLOW_ID);
  let emitted = 0;
  let skipped = 0;

  for (const product of input.products) {
    const idempotencyKey = reorderPrepareIdempotencyKey(product.id, input.asOf);
    const existing = await input.runs.findByIdempotencyKey(
      input.tenantId,
      idempotencyKey
    );
    if (existing) {
      skipped += 1;
      continue;
    }

    const payload = {
      productName: product.productName,
      sku: product.sku,
      quantityMajor: product.quantityMajor,
      unitOfMeasurement: product.unitOfMeasurement,
      thresholdMajor: product.thresholdMajor,
      asOf: input.asOf,
    };

    const persisted = await persistDomainEvent(input.outbox, {
      tenantId: input.tenantId,
      eventType: "StockLow",
      aggregateType: "Product",
      aggregateId: product.id,
      payload,
    });

    emitted += 1;
    if (!workflow) continue;

    const event: OutboxEventRecord = {
      id: persisted.id,
      tenantId: input.tenantId,
      eventType: "StockLow",
      aggregateType: "Product",
      aggregateId: product.id,
      payload,
      createdAt: new Date(),
      processedAt: null,
    };

    await enqueueWorkflowRun({
      workflow,
      event,
      runs: input.runs,
    });
  }

  return { emitted, skipped };
}
