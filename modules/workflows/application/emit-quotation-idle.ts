import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import type { OutboxEventRecord } from "@/modules/events/domain/types";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { enqueueWorkflowRun } from "@/modules/workflows/application/enqueue-run";
import { getWorkflow } from "@/modules/workflows/application/registry";
import { quotationFollowUpIdempotencyKey } from "@/modules/workflows/domain/expansion-keys";
import { QUOTATION_FOLLOW_UP_WORKFLOW_ID } from "@/modules/workflows/domain/types";
import type { WorkflowRunRepository } from "@/modules/workflows/infrastructure/workflow-run-repository";

export type IdleQuotationForFollowUp = {
  id: string;
  number: string;
  customerName: string;
  status: string;
  issuedOn: string;
};

/**
 * Emits one QuotationIdle catalog event per still-idle quotation for the
 * business day, then enqueues quotations.followup.
 */
export async function emitQuotationIdleEvents(input: {
  tenantId: string;
  asOf: string;
  idleDays: number;
  quotations: readonly IdleQuotationForFollowUp[];
  outbox: OutboxRepository;
  runs: WorkflowRunRepository;
}): Promise<{ emitted: number; skipped: number }> {
  const workflow = getWorkflow(QUOTATION_FOLLOW_UP_WORKFLOW_ID);
  let emitted = 0;
  let skipped = 0;

  for (const quotation of input.quotations) {
    const idempotencyKey = quotationFollowUpIdempotencyKey(
      quotation.id,
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

    const payload = {
      number: quotation.number,
      customerName: quotation.customerName,
      status: quotation.status,
      issuedOn: quotation.issuedOn,
      asOf: input.asOf,
      idleDays: input.idleDays,
    };

    const persisted = await persistDomainEvent(input.outbox, {
      tenantId: input.tenantId,
      eventType: "QuotationIdle",
      aggregateType: "Quotation",
      aggregateId: quotation.id,
      payload,
    });

    emitted += 1;
    if (!workflow) continue;

    const event: OutboxEventRecord = {
      id: persisted.id,
      tenantId: input.tenantId,
      eventType: "QuotationIdle",
      aggregateType: "Quotation",
      aggregateId: quotation.id,
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
