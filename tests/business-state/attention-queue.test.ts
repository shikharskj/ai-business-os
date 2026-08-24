import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMemoryAccountRepository,
  createMemoryJournalRepository,
  ensureChartOfAccounts,
} from "@/modules/accounting";
import {
  createMemoryAttentionQueueRepository,
  createMemoryBusinessStateProjectionRepository,
  createBusinessStateOutboxConsumer,
  dismissAttentionItem,
  ensureAttentionQueueFresh,
  IDLE_QUOTATION_DAYS,
  listOpenAttention,
  recordPaidAfterReminderOutcomes,
  recordPaymentReminderOutcomes,
  rebuildBusinessStateProjections,
  type ProjectionFamily,
} from "@/modules/business-state";
import { createProduct } from "@/modules/catalog";
import { createMemoryCatalogRepository } from "@/modules/catalog";
import { createMemoryExpenseRepository } from "@/modules/expenses";
import type { Expense } from "@/modules/expenses/domain/types";
import {
  clearOutboxConsumers,
  createMemoryOutboxDispatchRepository,
  processOutboxConsumers,
  registerOutboxConsumer,
  type OutboxEventRecord,
} from "@/modules/events";
import {
  createMemoryInventoryRepository,
  quantityFromMajor,
  recordOpeningStock,
} from "@/modules/inventory";
import { createMemoryPaymentRepository } from "@/modules/payments";
import { createMemorySalesRepository } from "@/modules/sales";
import type { Quotation, SalesInvoice } from "@/modules/sales/domain/types";
import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";

const FROZEN_NOW = new Date("2026-08-21T12:00:00.000+05:30");
const zero = money(0n);

function invoiceFixture(
  overrides: Partial<SalesInvoice> &
    Pick<SalesInvoice, "id" | "tenantId" | "number" | "status">
): SalesInvoice {
  const taxable = overrides.taxableAmount ?? money(1000_00n);
  const totalTax = overrides.totalTax ?? money(180_00n);
  const grandTotal =
    overrides.grandTotal ?? money(taxable.amountMinor + totalTax.amountMinor);
  const issuedOn = overrides.issuedOn ?? businessDate("2026-07-01");
  return {
    customerId: "cust-1",
    customerName: "Acme Traders",
    quotationId: null,
    salesOrderId: null,
    journalId: "jr-1",
    dueOn: businessDate("2026-08-01"),
    notes: null,
    placeOfSupplyStateCode: "27",
    subtotal: taxable,
    discountTotal: zero,
    taxableAmount: taxable,
    cgst: money(90_00n),
    sgst: money(90_00n),
    igst: zero,
    totalTax,
    grandTotal,
    supplyType: "INTRA_STATE",
    lines: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    issuedOn,
    postedAt: overrides.postedAt ?? new Date(`${issuedOn}T10:00:00.000Z`),
  };
}

function quotationFixture(
  overrides: Partial<Quotation> &
    Pick<Quotation, "id" | "tenantId" | "number" | "status">
): Quotation {
  const taxable = overrides.taxableAmount ?? money(500_00n);
  const totalTax = overrides.totalTax ?? money(90_00n);
  const grandTotal =
    overrides.grandTotal ?? money(taxable.amountMinor + totalTax.amountMinor);
  const issuedOn = overrides.issuedOn ?? businessDate("2026-08-01");
  return {
    customerId: "cust-1",
    customerName: "Acme Traders",
    validUntil: null,
    notes: null,
    placeOfSupplyStateCode: "27",
    subtotal: taxable,
    discountTotal: zero,
    taxableAmount: taxable,
    cgst: money(45_00n),
    sgst: money(45_00n),
    igst: zero,
    totalTax,
    grandTotal,
    supplyType: "INTRA_STATE",
    lines: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    issuedOn,
  };
}

function expenseFixture(
  overrides: Partial<Expense> & Pick<Expense, "id" | "tenantId" | "number">
): Expense {
  const grandTotal = overrides.grandTotal ?? money(100_00n);
  return {
    category: "OFFICE",
    incurredOn: businessDate("2026-08-10"),
    method: "CASH",
    vendorGstin: null,
    notes: null,
    taxableAmount: grandTotal,
    taxRateBps: 0,
    cgst: zero,
    sgst: zero,
    igst: zero,
    totalTax: zero,
    grandTotal,
    supplyType: "NONE",
    treatment: "EXEMPT",
    journalId: "jr-exp",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function outboxEvent(
  partial: Partial<OutboxEventRecord> &
    Pick<OutboxEventRecord, "eventType" | "tenantId" | "aggregateId">
): OutboxEventRecord {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tenantId: partial.tenantId,
    eventType: partial.eventType,
    aggregateType: partial.aggregateType ?? "SalesInvoice",
    aggregateId: partial.aggregateId,
    payload: partial.payload ?? {},
    createdAt: partial.createdAt ?? new Date(),
    processedAt: partial.processedAt ?? null,
  };
}

async function seededAccounting(tenantId = "tenant-a") {
  const accounts = createMemoryAccountRepository();
  const journals = createMemoryJournalRepository();
  await ensureChartOfAccounts({ tenantId, accountRepository: accounts });
  return { accounts, journals };
}

describe("attention queue (post-mvp 04)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });

  afterEach(() => {
    clearOutboxConsumers();
    vi.useRealTimers();
  });

  it("rebuilds overdue and low-stock items for the owning tenant only", async () => {
    const catalog = createMemoryCatalogRepository();
    const inventory = createMemoryInventoryRepository();
    const audit = createMemoryAuditRepository();
    const stockOutbox = createMemoryOutboxRepository();
    const product = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        kind: "PRODUCT",
        name: "Basmati Rice",
        sku: "RICE-1",
        unitOfMeasurement: "KG",
        sellingPrice: money(250_00n),
        purchasePrice: money(200_00n),
        taxRateBps: 500,
        tracksInventory: true,
      },
      catalog,
      audit,
      outbox: stockOutbox,
    });
    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      quantity: quantityFromMajor("1"),
      occurredOn: businessDate("2026-08-01"),
      catalog,
      inventory,
      audit,
      outbox: stockOutbox,
    });

    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-overdue",
          tenantId: "tenant-a",
          number: "INV/1",
          status: "POSTED",
        }),
        invoiceFixture({
          id: "inv-other",
          tenantId: "tenant-b",
          number: "INV/9",
          status: "POSTED",
        }),
      ]
    );
    const attention = createMemoryAttentionQueueRepository();

    await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog,
      inventory,
      expenses: createMemoryExpenseRepository(),
      ...(await seededAccounting()),
      projections: createMemoryBusinessStateProjectionRepository(),
      attention,
    });

    const open = await listOpenAttention({ tenantId: "tenant-a", attention });
    expect(open.map((row) => row.type).sort()).toEqual([
      "LOW_STOCK",
      "OVERDUE_RECEIVABLE",
    ]);
    expect(open.every((row) => row.tenantId === "tenant-a")).toBe(true);
    expect(open.some((row) => row.href.includes("inv-overdue"))).toBe(true);
    expect(open.some((row) => row.resourceId === product.id)).toBe(true);

    const other = await listOpenAttention({ tenantId: "tenant-b", attention });
    expect(other).toEqual([]);
  });

  it("surfaces idle SENT quotations older than the idle window", async () => {
    expect(IDLE_QUOTATION_DAYS).toBe(7);
    const sales = createMemorySalesRepository([
      quotationFixture({
        id: "qt-idle",
        tenantId: "tenant-a",
        number: "QT/1",
        status: "SENT",
        issuedOn: businessDate("2026-08-01"),
      }),
      quotationFixture({
        id: "qt-fresh",
        tenantId: "tenant-a",
        number: "QT/2",
        status: "SENT",
        issuedOn: businessDate("2026-08-18"),
      }),
    ]);
    const attention = createMemoryAttentionQueueRepository();

    await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      expenses: createMemoryExpenseRepository(),
      ...(await seededAccounting()),
      projections: createMemoryBusinessStateProjectionRepository(),
      attention,
      families: ["attentionQueue"],
    });

    const open = await listOpenAttention({ tenantId: "tenant-a", attention });
    expect(open).toHaveLength(1);
    expect(open[0]?.type).toBe("IDLE_QUOTATION");
    expect(open[0]?.resourceId).toBe("qt-idle");
    expect(open[0]?.href).toBe("/app/sales/quotations/qt-idle");
  });

  it("surfaces unusual expenses versus the recent category average", async () => {
    const expenses = createMemoryExpenseRepository([
      expenseFixture({
        id: "exp-1",
        tenantId: "tenant-a",
        number: "EXP/1",
        incurredOn: businessDate("2026-08-08"),
        grandTotal: money(100_00n),
      }),
      expenseFixture({
        id: "exp-2",
        tenantId: "tenant-a",
        number: "EXP/2",
        incurredOn: businessDate("2026-08-09"),
        grandTotal: money(100_00n),
      }),
      expenseFixture({
        id: "exp-3",
        tenantId: "tenant-a",
        number: "EXP/3",
        incurredOn: businessDate("2026-08-10"),
        grandTotal: money(100_00n),
      }),
      expenseFixture({
        id: "exp-spike",
        tenantId: "tenant-a",
        number: "EXP/4",
        incurredOn: businessDate("2026-08-20"),
        grandTotal: money(500_00n),
      }),
    ]);
    const attention = createMemoryAttentionQueueRepository();

    await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales: createMemorySalesRepository(),
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      expenses,
      ...(await seededAccounting()),
      projections: createMemoryBusinessStateProjectionRepository(),
      attention,
      families: ["attentionQueue"],
    });

    const open = await listOpenAttention({ tenantId: "tenant-a", attention });
    expect(open).toHaveLength(1);
    expect(open[0]?.type).toBe("UNUSUAL_EXPENSE");
    expect(open[0]?.resourceId).toBe("exp-spike");
    expect(open[0]?.href).toBe("/app/expenses/exp-spike");
    expect(toMajorString(open[0]!.amount!)).toBe("500.00");
  });

  it("dismisses an item idempotently, records an outcome, and does not mutate invoices", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-overdue",
          tenantId: "tenant-a",
          number: "INV/1",
          status: "POSTED",
        }),
      ]
    );
    const attention = createMemoryAttentionQueueRepository();
    await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      expenses: createMemoryExpenseRepository(),
      ...(await seededAccounting()),
      projections: createMemoryBusinessStateProjectionRepository(),
      attention,
      families: ["attentionQueue"],
    });

    const [item] = await listOpenAttention({ tenantId: "tenant-a", attention });
    expect(item).toBeDefined();

    const audit = createMemoryAuditRepository();
    const outbox = createMemoryOutboxRepository();
    const first = await dismissAttentionItem({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      attentionItemId: item!.id,
      attention,
      audit,
      outbox,
    });
    const second = await dismissAttentionItem({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      attentionItemId: item!.id,
      attention,
      audit,
      outbox,
    });

    expect(first.alreadyDismissed).toBe(false);
    expect(second.alreadyDismissed).toBe(true);
    expect(await listOpenAttention({ tenantId: "tenant-a", attention })).toEqual(
      []
    );
    expect(outbox.events.filter((row) => row.eventType === "AttentionDismissed")).toHaveLength(
      1
    );
    expect(
      outbox.events.filter((row) => row.eventType === "AutomationOutcomeRecorded")
    ).toHaveLength(1);
    expect(attention.outcomes).toHaveLength(1);
    expect(attention.outcomes[0]?.kind).toBe("ATTENTION_DISMISSED");

    const stillPosted = await sales.findInvoiceById("tenant-a", "inv-overdue");
    expect(stillPosted?.status).toBe("POSTED");
    expect(toMajorString(stillPosted!.grandTotal)).toBe("1180.00");

    await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      expenses: createMemoryExpenseRepository(),
      ...(await seededAccounting()),
      projections: createMemoryBusinessStateProjectionRepository(),
      attention,
      families: ["attentionQueue"],
    });
    expect(await listOpenAttention({ tenantId: "tenant-a", attention })).toEqual(
      []
    );
  });

  it("drops open items when the overdue invoice is paid", async () => {
    const invoice = invoiceFixture({
      id: "inv-overdue",
      tenantId: "tenant-a",
      number: "INV/1",
      status: "POSTED",
    });
    const sales = createMemorySalesRepository([], [invoice]);
    const payments = createMemoryPaymentRepository();
    const attention = createMemoryAttentionQueueRepository();
    const rebuildDeps = {
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments,
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      expenses: createMemoryExpenseRepository(),
      ...(await seededAccounting()),
      projections: createMemoryBusinessStateProjectionRepository(),
      attention,
      families: ["attentionQueue"] as ProjectionFamily[],
    };

    await rebuildBusinessStateProjections(rebuildDeps);
    expect(
      (await listOpenAttention({ tenantId: "tenant-a", attention })).length
    ).toBe(1);

    await payments.createPayment({
      id: "pay-1",
      tenantId: "tenant-a",
      number: "RCPT/1",
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      receivedOn: businessDate("2026-08-21"),
      method: "UPI",
      amount: invoice.grandTotal,
      reference: null,
      notes: null,
      journalId: "jr-pay",
      allocations: [
        {
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          amount: invoice.grandTotal,
        },
      ],
    });

    await rebuildBusinessStateProjections(rebuildDeps);
    expect(await listOpenAttention({ tenantId: "tenant-a", attention })).toEqual(
      []
    );
  });

  it("outbox consumer upserts attention after a posted invoice", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-1",
          tenantId: "tenant-a",
          number: "INV/1",
          status: "POSTED",
        }),
      ]
    );
    const attention = createMemoryAttentionQueueRepository();
    const outbox = createMemoryOutboxDispatchRepository([
      outboxEvent({
        id: "evt-1",
        tenantId: "tenant-a",
        eventType: "SalesInvoicePosted",
        aggregateId: "inv-1",
      }),
    ]);

    registerOutboxConsumer(
      createBusinessStateOutboxConsumer({
        sales,
        payments: createMemoryPaymentRepository(),
        catalog: createMemoryCatalogRepository(),
        inventory: createMemoryInventoryRepository(),
        expenses: createMemoryExpenseRepository(),
        ...(await seededAccounting()),
        projections: createMemoryBusinessStateProjectionRepository(),
        attention,
        async resolveTenantContext(tenantId) {
          if (tenantId !== "tenant-a") return null;
          return {
            timezone: "Asia/Kolkata",
            currency: "INR",
            lowStockThresholdMajor: "5.0000",
          };
        },
      })
    );

    await processOutboxConsumers({ outbox });
    const open = await listOpenAttention({ tenantId: "tenant-a", attention });
    expect(open).toHaveLength(1);
    expect(open[0]?.type).toBe("OVERDUE_RECEIVABLE");
  });

  it("records reminder sent and paid-after-reminder outcomes", async () => {
    const attention = createMemoryAttentionQueueRepository();
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-overdue",
          tenantId: "tenant-a",
          number: "INV/1",
          status: "POSTED",
        }),
      ]
    );
    await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      expenses: createMemoryExpenseRepository(),
      ...(await seededAccounting()),
      projections: createMemoryBusinessStateProjectionRepository(),
      attention,
      families: ["attentionQueue"],
    });

    await recordPaymentReminderOutcomes({
      tenantId: "tenant-a",
      invoiceId: "inv-overdue",
      asOf: "2026-08-21",
      delivered: false,
      attention,
    });
    expect(attention.outcomes.map((row) => row.kind)).toEqual([
      "REMINDER_PROPOSED",
    ]);

    await recordPaymentReminderOutcomes({
      tenantId: "tenant-a",
      invoiceId: "inv-overdue",
      asOf: "2026-08-21",
      delivered: true,
      attention,
    });
    expect(attention.outcomes.map((row) => row.kind).sort()).toEqual([
      "REMINDER_PROPOSED",
      "REMINDER_SENT",
    ]);

    const paid = await recordPaidAfterReminderOutcomes({
      tenantId: "tenant-a",
      paymentId: "pay-1",
      invoiceIds: ["inv-overdue"],
      attention,
    });
    expect(paid).toBe(1);
    expect(
      attention.outcomes.some((row) => row.kind === "PAID_AFTER_REMINDER")
    ).toBe(true);

    const duplicate = await recordPaidAfterReminderOutcomes({
      tenantId: "tenant-a",
      paymentId: "pay-1",
      invoiceIds: ["inv-overdue"],
      attention,
    });
    expect(duplicate).toBe(0);
  });

  it("ensureAttentionQueueFresh rebuilds once when meta.rebuiltAt is null", async () => {
    const catalog = createMemoryCatalogRepository();
    const inventory = createMemoryInventoryRepository();
    const audit = createMemoryAuditRepository();
    const stockOutbox = createMemoryOutboxRepository();
    const product = await createProduct({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      fields: {
        kind: "PRODUCT",
        name: "Basmati Rice",
        sku: "RICE-1",
        unitOfMeasurement: "KG",
        sellingPrice: money(250_00n),
        purchasePrice: money(200_00n),
        taxRateBps: 500,
        tracksInventory: true,
      },
      catalog,
      audit,
      outbox: stockOutbox,
    });
    await recordOpeningStock({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      productId: product.id,
      quantity: quantityFromMajor("1"),
      occurredOn: businessDate("2026-08-01"),
      catalog,
      inventory,
      audit,
      outbox: stockOutbox,
    });

    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-overdue",
          tenantId: "tenant-a",
          number: "INV/1",
          status: "POSTED",
        }),
      ]
    );
    const attention = createMemoryAttentionQueueRepository();
    const projections = createMemoryBusinessStateProjectionRepository();
    const accounting = await seededAccounting();

    const first = await ensureAttentionQueueFresh({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog,
      inventory,
      expenses: createMemoryExpenseRepository(),
      ...accounting,
      projections,
      attention,
    });
    expect(first.rebuilt).toBe(true);

    const open = await listOpenAttention({ tenantId: "tenant-a", attention });
    expect(open.map((row) => row.type).sort()).toEqual([
      "LOW_STOCK",
      "OVERDUE_RECEIVABLE",
    ]);

    const meta = await projections.getMeta("tenant-a");
    expect(meta?.rebuiltAt).not.toBeNull();

    const second = await ensureAttentionQueueFresh({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog,
      inventory,
      expenses: createMemoryExpenseRepository(),
      ...accounting,
      projections,
      attention,
    });
    expect(second.rebuilt).toBe(false);
  });

  it("ensureAttentionQueueFresh skips when rebuiltAt is already stamped", async () => {
    const projections = createMemoryBusinessStateProjectionRepository();
    const attention = createMemoryAttentionQueueRepository();
    const accounting = await seededAccounting();

    await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales: createMemorySalesRepository(),
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      expenses: createMemoryExpenseRepository(),
      ...accounting,
      projections,
      attention,
      families: ["attentionQueue"],
      markRebuilt: true,
    });

    const result = await ensureAttentionQueueFresh({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales: createMemorySalesRepository(),
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      expenses: createMemoryExpenseRepository(),
      ...accounting,
      projections,
      attention,
    });
    expect(result.rebuilt).toBe(false);
  });

  it("ensureAttentionQueueFresh rebuilds when rebuiltAt is older than TTL", async () => {
    const projections = createMemoryBusinessStateProjectionRepository();
    const attention = createMemoryAttentionQueueRepository();
    const accounting = await seededAccounting();

    await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales: createMemorySalesRepository(),
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      expenses: createMemoryExpenseRepository(),
      ...accounting,
      projections,
      attention,
      families: ["attentionQueue"],
      markRebuilt: true,
    });

    const staleNow = new Date(FROZEN_NOW.getTime() + 7 * 60 * 60 * 1000);
    const result = await ensureAttentionQueueFresh({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales: createMemorySalesRepository(),
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      expenses: createMemoryExpenseRepository(),
      ...accounting,
      projections,
      attention,
      now: staleNow,
    });
    expect(result.rebuilt).toBe(true);
  });
});
