import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import type { OutboxEventRecord } from "@/modules/events/domain/types";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import type { AttentionQueueRepository } from "@/modules/business-state/domain/attention-repository";
import { enqueueWorkflowRun } from "@/modules/workflows/application/enqueue-run";
import { getWorkflow } from "@/modules/workflows/application/registry";
import {
  collectionsCooldownMs,
  collectionsRemindIdempotencyKey,
} from "@/modules/workflows/domain/collections-keys";
import { COLLECTIONS_REMIND_WORKFLOW_ID } from "@/modules/workflows/domain/types";
import type { WorkflowRunRepository } from "@/modules/workflows/infrastructure/workflow-run-repository";

export type OverdueInvoiceForCollections = {
  id: string;
  number: string;
  customerName: string;
  dueOn: string;
};

/**
 * Emits one InvoiceOverdue catalog event per still-overdue invoice for the
 * business day, then enqueues collections.remind. Daily keys + cooldown skip
 * duplicates so the same overdue set does not spam reminders.
 */
export async function emitInvoiceOverdueEvents(input: {
  tenantId: string;
  asOf: string;
  overdue: readonly OverdueInvoiceForCollections[];
  outbox: OutboxRepository;
  runs: WorkflowRunRepository;
  attention: AttentionQueueRepository;
}): Promise<{ emitted: number; skipped: number }> {
  const workflow = getWorkflow(COLLECTIONS_REMIND_WORKFLOW_ID);
  let emitted = 0;
  let skipped = 0;

  for (const invoice of input.overdue) {
    const idempotencyKey = collectionsRemindIdempotencyKey(
      invoice.id,
      input.asOf
    );
    const existing = await input.runs.findByIdempotencyKey(
      input.tenantId,
      idempotencyKey
    );
    if (existing) {
      skipped += 1;
      continue;
    }

    const recentSent = await input.attention.listOutcomes({
      tenantId: input.tenantId,
      kind: "REMINDER_SENT",
      resourceType: "SalesInvoice",
      resourceIds: [invoice.id],
      recordedAfter: new Date(Date.now() - collectionsCooldownMs()),
    });
    if (recentSent.length > 0) {
      skipped += 1;
      continue;
    }

    const persisted = await persistDomainEvent(input.outbox, {
      tenantId: input.tenantId,
      eventType: "InvoiceOverdue",
      aggregateType: "SalesInvoice",
      aggregateId: invoice.id,
      payload: {
        number: invoice.number,
        customerName: invoice.customerName,
        dueOn: invoice.dueOn,
        asOf: input.asOf,
      },
    });

    emitted += 1;

    if (!workflow) continue;

    const event: OutboxEventRecord = {
      id: persisted.id,
      tenantId: input.tenantId,
      eventType: "InvoiceOverdue",
      aggregateType: "SalesInvoice",
      aggregateId: invoice.id,
      payload: {
        number: invoice.number,
        customerName: invoice.customerName,
        dueOn: invoice.dueOn,
        asOf: input.asOf,
      },
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
