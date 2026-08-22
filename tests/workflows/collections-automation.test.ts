import { afterEach, describe, expect, it } from "vitest";

import { listCollectionsOutcomes } from "@/modules/business-state";
import { overdueReceivableNaturalKey } from "@/modules/business-state/domain/attention-keys";
import { ATTENTION_SEVERITY } from "@/modules/business-state/domain/types";
import type { OutboxEventRecord } from "@/modules/events";
import { money } from "@/modules/shared-kernel/money";
import {
  defaultAutonomyPolicy,
  type TenantAutonomyPolicy,
} from "@/modules/tenant/domain/autonomy-policy";
import {
  clearWorkflows,
  COLLECTIONS_REMIND_WORKFLOW_ID,
  createCollectionsRemindWorkflow,
  createMemoryWorkflowRunRepository,
  emitInvoiceOverdueEvents,
  enqueueWorkflowRun,
  processDueWorkflowRuns,
  rankCollectionsCandidates,
  registerWorkflow,
  type ExecuteWorkflowRunDeps,
} from "@/modules/workflows";
import { toolContext } from "../ai/tool-context-fixture";

const TENANT = "tenant-a";
const AS_OF = "2026-08-22";
const INVOICE_ID = "inv-a1";

function l4Policy(
  overrides: Partial<TenantAutonomyPolicy> = {}
): TenantAutonomyPolicy {
  return {
    ...defaultAutonomyPolicy(TENANT),
    allowedActionClasses: ["payment_reminder"],
    amountThresholds: { payment_reminder: "25000.00" },
    ...overrides,
  };
}

function overdueEvent(
  partial: Partial<OutboxEventRecord> = {}
): OutboxEventRecord {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tenantId: partial.tenantId ?? TENANT,
    eventType: "InvoiceOverdue",
    aggregateType: "SalesInvoice",
    aggregateId: partial.aggregateId ?? INVOICE_ID,
    payload: partial.payload ?? {
      number: "INV/20-21/1",
      customerName: "Acme Traders",
      dueOn: "2020-04-14",
      asOf: AS_OF,
    },
    createdAt: partial.createdAt ?? new Date(),
    processedAt: partial.processedAt ?? null,
  };
}

async function seedOverdueAttention(
  attention: ReturnType<typeof toolContext>["repositories"]["attention"],
  rows: Array<{ invoiceId: string; amountMinor: bigint; daysOverdue: number }>
) {
  await attention.syncItems({
    tenantId: TENANT,
    computedAt: new Date(),
    items: rows.map((row) => ({
      naturalKey: overdueReceivableNaturalKey(row.invoiceId),
      type: "OVERDUE_RECEIVABLE" as const,
      severity: ATTENTION_SEVERITY.OVERDUE_RECEIVABLE_BASE + row.daysOverdue,
      title: `${row.invoiceId} overdue`,
      body: "Overdue receivable",
      href: `/app/sales/invoices/${row.invoiceId}`,
      resourceType: "SalesInvoice",
      resourceId: row.invoiceId,
      amount: money(row.amountMinor),
      currency: "INR",
      factId: `attention:overdue-receivable:${row.invoiceId}`,
    })),
  });
}

function runtime(policy: TenantAutonomyPolicy = defaultAutonomyPolicy(TENANT)) {
  const context = toolContext();
  context.autonomyPolicy = { ...policy, tenantId: context.tenantId };
  const runs = createMemoryWorkflowRunRepository();
  const deps: ExecuteWorkflowRunDeps = {
    runs,
    attention: context.repositories.attention,
    outbox: context.repositories.outbox,
    async resolveTenantContext(tenantId) {
      return {
        actorUserId: context.actorUserId,
        currency: context.currency,
        timezone: context.timezone,
        policy: { ...policy, tenantId },
      };
    },
    async resolveToolContext() {
      return context;
    },
  };
  return { context, deps, runs };
}

describe("collections automation (post-mvp 10)", () => {
  afterEach(() => {
    clearWorkflows();
  });

  it("ranks overdue invoices by outstanding amount then days overdue", () => {
    const ranked = rankCollectionsCandidates([
      { invoiceId: "small-old", outstandingMinor: 100_00n, daysOverdue: 40 },
      { invoiceId: "large", outstandingMinor: 5000_00n, daysOverdue: 2 },
      { invoiceId: "small-newer", outstandingMinor: 100_00n, daysOverdue: 3 },
    ]);
    expect(ranked.map((row) => row.invoiceId)).toEqual([
      "large",
      "small-old",
      "small-newer",
    ]);
  });

  it("prepares a reminder under L3 when L4 is off and does not send", async () => {
    const { context, deps, runs } = runtime();
    await seedOverdueAttention(context.repositories.attention, [
      { invoiceId: INVOICE_ID, amountMinor: 1180_00n, daysOverdue: 10 },
      { invoiceId: "inv-a2", amountMinor: 4720_00n, daysOverdue: 20 },
    ]);
    const workflow = createCollectionsRemindWorkflow();
    registerWorkflow(workflow);

    await enqueueWorkflowRun({
      workflow,
      event: overdueEvent(),
      runs: deps.runs,
    });
    await processDueWorkflowRuns({ deps });

    expect(runs.runs).toHaveLength(1);
    expect(runs.runs[0]?.status).toBe("SUCCEEDED");
    expect(runs.runs[0]?.result).toMatchObject({
      dryRun: true,
    });
    expect(context.notificationRecords).toHaveLength(0);

    const outcomes = await listCollectionsOutcomes({
      tenantId: TENANT,
      invoiceId: INVOICE_ID,
      attention: context.repositories.attention,
    });
    expect(outcomes.map((row) => row.kind)).toContain("REMINDER_PROPOSED");
    expect(outcomes.map((row) => row.kind)).not.toContain("REMINDER_SENT");
  });

  it("sends an in-app reminder at L4 when policy allows the amount", async () => {
    const { context, deps, runs } = runtime(l4Policy());
    await seedOverdueAttention(context.repositories.attention, [
      { invoiceId: INVOICE_ID, amountMinor: 1180_00n, daysOverdue: 10 },
    ]);
    const workflow = createCollectionsRemindWorkflow();
    registerWorkflow(workflow);

    await enqueueWorkflowRun({
      workflow,
      event: overdueEvent(),
      runs: deps.runs,
    });
    await processDueWorkflowRuns({ deps });

    expect(runs.runs[0]?.status).toBe("SUCCEEDED");
    expect(context.notificationRecords).toHaveLength(1);
    expect(context.notificationRecords[0]?.type).toBe("INVOICE_OVERDUE");
    expect(context.auditRecords.some((row) => row.action === "ai.tool.invoked")).toBe(
      true
    );

    const outcomes = await listCollectionsOutcomes({
      tenantId: TENANT,
      invoiceId: INVOICE_ID,
      attention: context.repositories.attention,
    });
    expect(outcomes.map((row) => row.kind)).toEqual(
      expect.arrayContaining(["REMINDER_PROPOSED", "REMINDER_SENT"])
    );
  });

  it("does not auto-send when the amount is over the L4 ceiling", async () => {
    const { context, deps, runs } = runtime(l4Policy({ amountThresholds: { payment_reminder: "1000.00" } }));
    await seedOverdueAttention(context.repositories.attention, [
      { invoiceId: INVOICE_ID, amountMinor: 1180_00n, daysOverdue: 10 },
    ]);
    registerWorkflow(createCollectionsRemindWorkflow());

    await enqueueWorkflowRun({
      workflow: createCollectionsRemindWorkflow(),
      event: overdueEvent(),
      runs: deps.runs,
    });
    await processDueWorkflowRuns({ deps });

    expect(context.notificationRecords).toHaveLength(0);
    expect(runs.runs[0]?.status).toBe("SUCCEEDED");
    expect(runs.runs[0]?.result).toMatchObject({ dryRun: true });
  });

  it("does not enqueue a second run for the same invoice on the same day", async () => {
    const { context, deps, runs } = runtime();
    await seedOverdueAttention(context.repositories.attention, [
      { invoiceId: INVOICE_ID, amountMinor: 1180_00n, daysOverdue: 10 },
    ]);
    const workflow = createCollectionsRemindWorkflow();
    registerWorkflow(workflow);

    const first = overdueEvent({ id: "evt-1" });
    const second = overdueEvent({ id: "evt-2" });
    await enqueueWorkflowRun({ workflow, event: first, runs: deps.runs });
    await enqueueWorkflowRun({ workflow, event: second, runs: deps.runs });

    expect(runs.runs).toHaveLength(1);
  });

  it("skips a later run while a reminder sent is still inside the cooldown", async () => {
    const { context, deps, runs } = runtime(l4Policy());
    await seedOverdueAttention(context.repositories.attention, [
      { invoiceId: INVOICE_ID, amountMinor: 1180_00n, daysOverdue: 10 },
    ]);
    const workflow = createCollectionsRemindWorkflow();
    registerWorkflow(workflow);

    await enqueueWorkflowRun({
      workflow,
      event: overdueEvent({ id: "evt-day-1" }),
      runs: deps.runs,
    });
    await processDueWorkflowRuns({ deps });
    expect(context.notificationRecords).toHaveLength(1);

    const nextDay = overdueEvent({
      id: "evt-day-2",
      payload: {
        number: "INV/20-21/1",
        dueOn: "2020-04-14",
        asOf: "2026-08-23",
      },
    });
    await enqueueWorkflowRun({
      workflow,
      event: nextDay,
      runs: deps.runs,
    });
    await processDueWorkflowRuns({ deps });

    expect(runs.runs).toHaveLength(2);
    expect(runs.runs[1]?.status).toBe("SKIPPED");
    expect(runs.runs[1]?.result.skipReason).toBe("cooldown");
    expect(context.notificationRecords).toHaveLength(1);
  });

  it("emits InvoiceOverdue once per invoice per day and skips cooldown duplicates", async () => {
    const { context, deps, runs } = runtime();
    await seedOverdueAttention(context.repositories.attention, [
      { invoiceId: INVOICE_ID, amountMinor: 1180_00n, daysOverdue: 10 },
    ]);
    registerWorkflow(createCollectionsRemindWorkflow());

    const first = await emitInvoiceOverdueEvents({
      tenantId: TENANT,
      asOf: AS_OF,
      overdue: [
        {
          id: INVOICE_ID,
          number: "INV/20-21/1",
          customerName: "Acme Traders",
          dueOn: "2020-04-14",
        },
      ],
      outbox: context.repositories.outbox,
      runs: deps.runs,
      attention: context.repositories.attention,
    });
    expect(first.emitted).toBe(1);
    expect(runs.runs).toHaveLength(1);

    const second = await emitInvoiceOverdueEvents({
      tenantId: TENANT,
      asOf: AS_OF,
      overdue: [
        {
          id: INVOICE_ID,
          number: "INV/20-21/1",
          customerName: "Acme Traders",
          dueOn: "2020-04-14",
        },
      ],
      outbox: context.repositories.outbox,
      runs: deps.runs,
      attention: context.repositories.attention,
    });
    expect(second.emitted).toBe(0);
    expect(second.skipped).toBe(1);
    expect(runs.runs).toHaveLength(1);
  });
});
