import { afterEach, describe, expect, it } from "vitest";

import { findUnusualExpenses } from "@/modules/business-state/domain/expense-anomaly";
import {
  idleQuotationNaturalKey,
  lowStockNaturalKey,
  unusualExpenseNaturalKey,
} from "@/modules/business-state/domain/attention-keys";
import { ATTENTION_SEVERITY } from "@/modules/business-state/domain/types";
import { projectionFamiliesForEvent } from "@/modules/business-state/application/event-families";
import type { Expense } from "@/modules/expenses/domain/types";
import type { OutboxEventRecord } from "@/modules/events";
import {
  quantityFromMajor,
  toQuantityMajorString,
} from "@/modules/inventory";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";
import { defaultAutonomyPolicy } from "@/modules/tenant/domain/autonomy-policy";
import {
  clearWorkflows,
  createExpenseAnomalyWorkflow,
  createMemoryWorkflowRunRepository,
  createQuotationFollowUpWorkflow,
  createReorderPrepareWorkflow,
  emitQuotationIdleEvents,
  emitStockLowEvents,
  enqueueWorkflowRun,
  EXPENSE_ANOMALY_WORKFLOW_ID,
  processDueWorkflowRuns,
  QUOTATION_FOLLOW_UP_WORKFLOW_ID,
  REORDER_PREPARE_WORKFLOW_ID,
  registerWorkflow,
  suggestReorderQuantity,
  type ExecuteWorkflowRunDeps,
} from "@/modules/workflows";
import { toolContext } from "../ai/tool-context-fixture";

const TENANT = "tenant-a";
const AS_OF = "2026-08-22";
const QUOTATION_ID = "qt-idle";
const PRODUCT_ID = "prod-a1";
const EXPENSE_ID = "exp-spike";

function expenseFixture(
  overrides: Partial<Expense> & Pick<Expense, "id" | "number" | "grandTotal">
): Expense {
  const zero = money(0n);
  return {
    tenantId: TENANT,
    category: "OFFICE",
    incurredOn: businessDate("2026-08-10"),
    method: "CASH",
    vendorGstin: null,
    notes: null,
    taxableAmount: overrides.grandTotal,
    taxRateBps: 0,
    cgst: zero,
    sgst: zero,
    igst: zero,
    totalTax: zero,
    supplyType: "NONE",
    treatment: "EXEMPT",
    journalId: "jr-exp",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function runtime() {
  const context = toolContext();
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
        policy: defaultAutonomyPolicy(tenantId),
      };
    },
    async resolveToolContext() {
      return context;
    },
  };
  return { context, deps, runs };
}

describe("automation expansions (post-mvp 11)", () => {
  afterEach(() => {
    clearWorkflows();
  });

  it("does not treat ExpenseRecorded as cash-only — attention rebuilds too", () => {
    expect(projectionFamiliesForEvent("ExpenseRecorded")).toEqual(
      expect.arrayContaining(["cashPosition", "attentionQueue"])
    );
  });

  it("flags an expense at least 2× the recent category average", () => {
    const matches = findUnusualExpenses({
      tenantId: TENANT,
      today: businessDate("2026-08-22"),
      expenses: [
        expenseFixture({
          id: "e1",
          number: "EXP/1",
          grandTotal: money(100_00n),
          incurredOn: businessDate("2026-08-08"),
        }),
        expenseFixture({
          id: "e2",
          number: "EXP/2",
          grandTotal: money(100_00n),
          incurredOn: businessDate("2026-08-09"),
        }),
        expenseFixture({
          id: "e3",
          number: "EXP/3",
          grandTotal: money(100_00n),
          incurredOn: businessDate("2026-08-10"),
        }),
        expenseFixture({
          id: "e4",
          number: "EXP/4",
          grandTotal: money(200_00n),
          incurredOn: businessDate("2026-08-20"),
        }),
      ],
    });
    expect(matches.map((row) => row.expense.id)).toEqual(["e4"]);
    expect(toMajorString(matches[0]!.categoryAverage)).toBe("100.00");
  });

  it("does not flag a first bill in a category", () => {
    expect(
      findUnusualExpenses({
        tenantId: TENANT,
        today: businessDate("2026-08-22"),
        expenses: [
          expenseFixture({
            id: "only",
            number: "EXP/1",
            grandTotal: money(50_000_00n),
            incurredOn: businessDate("2026-08-20"),
          }),
        ],
      })
    ).toEqual([]);
  });

  it("suggests at least enough quantity to rise above the low-stock threshold", () => {
    const suggested = suggestReorderQuantity({
      current: quantityFromMajor("1"),
      threshold: quantityFromMajor("5"),
      saleOutflow: quantityFromMajor("0"),
    });
    expect(toQuantityMajorString(suggested)).toBe("4.0000");
  });

  it("uses sale velocity as a cover stub without forecasting", () => {
    const suggested = suggestReorderQuantity({
      current: quantityFromMajor("1"),
      threshold: quantityFromMajor("5"),
      saleOutflow: quantityFromMajor("28"),
      windowDays: 14,
      coverDays: 14,
    });
    expect(toQuantityMajorString(suggested)).toBe("27.0000");
  });

  it("prepares an in-app quotation follow-up without sending", async () => {
    const { context, deps, runs } = runtime();
    await context.repositories.attention.syncItems({
      tenantId: TENANT,
      computedAt: new Date(),
      items: [
        {
          naturalKey: idleQuotationNaturalKey(QUOTATION_ID),
          type: "IDLE_QUOTATION",
          severity: ATTENTION_SEVERITY.IDLE_QUOTATION,
          title: "Quotation QT/1 is idle",
          body: "QT/1 for Acme Traders has been sent for 21 days without conversion.",
          href: `/app/sales/quotations/${QUOTATION_ID}`,
          resourceType: "Quotation",
          resourceId: QUOTATION_ID,
          amount: money(590_00n),
          currency: "INR",
          factId: "attention:idle-quotation:qt-idle",
        },
      ],
    });
    const workflow = createQuotationFollowUpWorkflow();
    registerWorkflow(workflow);

    const event: OutboxEventRecord = {
      id: crypto.randomUUID(),
      tenantId: TENANT,
      eventType: "QuotationIdle",
      aggregateType: "Quotation",
      aggregateId: QUOTATION_ID,
      payload: {
        number: "QT/1",
        customerName: "Acme Traders",
        status: "SENT",
        issuedOn: "2026-08-01",
        asOf: AS_OF,
        idleDays: 7,
      },
      createdAt: new Date(),
      processedAt: null,
    };
    await enqueueWorkflowRun({ workflow, event, runs: deps.runs });
    await processDueWorkflowRuns({ deps });

    expect(runs.runs[0]?.status).toBe("SUCCEEDED");
    expect(runs.runs[0]?.workflowId).toBe(QUOTATION_FOLLOW_UP_WORKFLOW_ID);
    expect(runs.runs[0]?.result).toMatchObject({ dryRun: true });
    expect(context.notificationRecords).toHaveLength(0);
    const outcomes = await context.repositories.attention.listOutcomes({
      tenantId: TENANT,
      kind: "QUOTATION_FOLLOW_UP_PROPOSED",
      resourceIds: [QUOTATION_ID],
    });
    expect(outcomes).toHaveLength(1);
  });

  it("prepares reorder inputs and never posts a purchase", async () => {
    const { context, deps, runs } = runtime();
    await context.repositories.attention.syncItems({
      tenantId: TENANT,
      computedAt: new Date(),
      items: [
        {
          naturalKey: lowStockNaturalKey(PRODUCT_ID),
          type: "LOW_STOCK",
          severity: ATTENTION_SEVERITY.LOW_STOCK,
          title: "Basmati Rice is low on stock",
          body: "Basmati Rice (RICE-1) is at 1.0000 KG.",
          href: `/app/inventory/stock/${PRODUCT_ID}`,
          resourceType: "Product",
          resourceId: PRODUCT_ID,
          amount: null,
          currency: null,
          factId: null,
        },
      ],
    });
    const workflow = createReorderPrepareWorkflow();
    registerWorkflow(workflow);

    const event: OutboxEventRecord = {
      id: crypto.randomUUID(),
      tenantId: TENANT,
      eventType: "StockLow",
      aggregateType: "Product",
      aggregateId: PRODUCT_ID,
      payload: {
        productName: "Basmati Rice",
        sku: "RICE-1",
        quantityMajor: "1.0000",
        unitOfMeasurement: "KG",
        thresholdMajor: "5.0000",
        asOf: AS_OF,
      },
      createdAt: new Date(),
      processedAt: null,
    };
    await enqueueWorkflowRun({ workflow, event, runs: deps.runs });
    await processDueWorkflowRuns({ deps });

    expect(runs.runs[0]?.status).toBe("SUCCEEDED");
    expect(runs.runs[0]?.workflowId).toBe(REORDER_PREPARE_WORKFLOW_ID);
    expect(runs.runs[0]?.result).toMatchObject({
      dryRun: true,
      action: {
        executed: false,
        payload: {
          posted: false,
          productId: PRODUCT_ID,
        },
      },
    });
    const purchases = await context.repositories.purchases.listPurchases({
      tenantId: TENANT,
    });
    expect(purchases).toHaveLength(0);
    const outcomes = await context.repositories.attention.listOutcomes({
      tenantId: TENANT,
      kind: "REORDER_PREPARED",
      resourceIds: [PRODUCT_ID],
    });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.payload).toMatchObject({ posted: false });
  });

  it("flags an unusual expense without recategorizing or posting", async () => {
    const { context, deps, runs } = runtime();
    await context.repositories.attention.syncItems({
      tenantId: TENANT,
      computedAt: new Date(),
      items: [
        {
          naturalKey: unusualExpenseNaturalKey(EXPENSE_ID),
          type: "UNUSUAL_EXPENSE",
          severity: ATTENTION_SEVERITY.UNUSUAL_EXPENSE,
          title: "EXP/4 looks unusually high",
          body: "EXP/4 is 2× the recent office average.",
          href: `/app/expenses/${EXPENSE_ID}`,
          resourceType: "Expense",
          resourceId: EXPENSE_ID,
          amount: money(500_00n),
          currency: "INR",
          factId: "attention:unusual-expense:exp-spike",
        },
      ],
    });
    const before = await context.repositories.expenses.listExpenses({
      tenantId: TENANT,
    });
    const workflow = createExpenseAnomalyWorkflow();
    registerWorkflow(workflow);

    const event: OutboxEventRecord = {
      id: crypto.randomUUID(),
      tenantId: TENANT,
      eventType: "ExpenseRecorded",
      aggregateType: "Expense",
      aggregateId: EXPENSE_ID,
      payload: { number: "EXP/4", category: "OFFICE" },
      createdAt: new Date(),
      processedAt: null,
    };
    await enqueueWorkflowRun({ workflow, event, runs: deps.runs });
    await processDueWorkflowRuns({ deps });

    expect(runs.runs[0]?.status).toBe("SUCCEEDED");
    expect(runs.runs[0]?.workflowId).toBe(EXPENSE_ANOMALY_WORKFLOW_ID);
    expect(runs.runs[0]?.result).toMatchObject({
      dryRun: true,
      action: { payload: { posted: false, recategorized: false } },
    });
    const after = await context.repositories.expenses.listExpenses({
      tenantId: TENANT,
    });
    expect(after).toHaveLength(before.length);
    expect(after.map((row) => row.category)).toEqual(
      before.map((row) => row.category)
    );
  });

  it("skips expense anomaly when the amount is not unusual", async () => {
    const { deps, runs } = runtime();
    registerWorkflow(createExpenseAnomalyWorkflow());
    await enqueueWorkflowRun({
      workflow: createExpenseAnomalyWorkflow(),
      event: {
        id: crypto.randomUUID(),
        tenantId: TENANT,
        eventType: "ExpenseRecorded",
        aggregateType: "Expense",
        aggregateId: "exp-normal",
        payload: { number: "EXP/1", category: "OFFICE" },
        createdAt: new Date(),
        processedAt: null,
      },
      runs: deps.runs,
    });
    await processDueWorkflowRuns({ deps });
    expect(runs.runs[0]?.status).toBe("SKIPPED");
    expect(runs.runs[0]?.result).toMatchObject({ skipReason: "not_unusual" });
  });

  it("emits QuotationIdle once per quotation per day", async () => {
    const { deps, runs } = runtime();
    registerWorkflow(createQuotationFollowUpWorkflow());
    const first = await emitQuotationIdleEvents({
      tenantId: TENANT,
      asOf: AS_OF,
      idleDays: 7,
      quotations: [
        {
          id: QUOTATION_ID,
          number: "QT/1",
          customerName: "Acme Traders",
          status: "SENT",
          issuedOn: "2026-08-01",
        },
      ],
      outbox: deps.outbox!,
      runs: deps.runs,
    });
    expect(first.emitted).toBe(1);
    expect(runs.runs).toHaveLength(1);

    const second = await emitQuotationIdleEvents({
      tenantId: TENANT,
      asOf: AS_OF,
      idleDays: 7,
      quotations: [
        {
          id: QUOTATION_ID,
          number: "QT/1",
          customerName: "Acme Traders",
          status: "SENT",
          issuedOn: "2026-08-01",
        },
      ],
      outbox: deps.outbox!,
      runs: deps.runs,
    });
    expect(second.emitted).toBe(0);
    expect(second.skipped).toBe(1);
    expect(runs.runs).toHaveLength(1);
  });

  it("emits StockLow once per product per day", async () => {
    const { deps, runs } = runtime();
    registerWorkflow(createReorderPrepareWorkflow());
    const first = await emitStockLowEvents({
      tenantId: TENANT,
      asOf: AS_OF,
      products: [
        {
          id: PRODUCT_ID,
          productName: "Basmati Rice",
          sku: "RICE-1",
          quantityMajor: "1.0000",
          unitOfMeasurement: "KG",
          thresholdMajor: "5.0000",
        },
      ],
      outbox: deps.outbox!,
      runs: deps.runs,
    });
    expect(first.emitted).toBe(1);

    const second = await emitStockLowEvents({
      tenantId: TENANT,
      asOf: AS_OF,
      products: [
        {
          id: PRODUCT_ID,
          productName: "Basmati Rice",
          sku: "RICE-1",
          quantityMajor: "1.0000",
          unitOfMeasurement: "KG",
          thresholdMajor: "5.0000",
        },
      ],
      outbox: deps.outbox!,
      runs: deps.runs,
    });
    expect(second.skipped).toBe(1);
    expect(runs.runs).toHaveLength(1);
  });
});
