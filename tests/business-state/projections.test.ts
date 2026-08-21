import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearOutboxConsumers,
  createMemoryOutboxDispatchRepository,
  processOutboxConsumers,
  registerOutboxConsumer,
  type OutboxEventRecord,
} from "@/modules/events";
import {
  BUSINESS_STATE_CONSUMER_NAME,
  BUSINESS_STATE_SCHEMA_VERSION,
  createBusinessStateOutboxConsumer,
  createMemoryBusinessStateProjectionRepository,
  getBusinessStateSummary,
  rebuildBusinessStateProjections,
  SALES_MOMENTUM_WINDOW_DAYS,
} from "@/modules/business-state";
import { createMemoryCatalogRepository } from "@/modules/catalog";
import { createMemoryInventoryRepository } from "@/modules/inventory";
import { createMemoryPaymentRepository } from "@/modules/payments";
import { createMemorySalesRepository } from "@/modules/sales";
import {
  createMemoryAccountRepository,
  createMemoryJournalRepository,
  ensureChartOfAccounts,
} from "@/modules/accounting";
import type { SalesInvoice } from "@/modules/sales/domain/types";
import { businessDate, todayInTimezone } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";

/** Frozen "now" so sales-momentum windows stay deterministic. */
const FROZEN_NOW = new Date("2026-08-21T12:00:00.000+05:30");
const IN_WINDOW_ISSUED_ON = businessDate("2026-08-10");
const OUT_OF_WINDOW_ISSUED_ON = businessDate("2026-07-01");

const zero = money(0n);

function addDays(date: string, days: number) {
  const cursor = new Date(`${date}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return businessDate(cursor.toISOString().slice(0, 10));
}

function invoiceFixture(
  overrides: Partial<SalesInvoice> &
    Pick<SalesInvoice, "id" | "tenantId" | "number" | "status">
): SalesInvoice {
  const taxable = overrides.taxableAmount ?? money(1000_00n);
  const totalTax = overrides.totalTax ?? money(180_00n);
  const grandTotal =
    overrides.grandTotal ?? money(taxable.amountMinor + totalTax.amountMinor);
  const issuedOn = overrides.issuedOn ?? IN_WINDOW_ISSUED_ON;
  return {
    customerId: "cust-1",
    customerName: "Acme",
    quotationId: null,
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

describe("business state projections (post-mvp 02)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });

  afterEach(() => {
    clearOutboxConsumers();
    vi.useRealTimers();
  });

  it("rebuild computes receivables, inventory, and sales momentum from domain truth", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-1",
          tenantId: "tenant-a",
          number: "INV/1",
          status: "POSTED",
          dueOn: businessDate("2026-08-01"),
        }),
        invoiceFixture({
          id: "inv-2",
          tenantId: "tenant-a",
          number: "INV/2",
          status: "POSTED",
          dueOn: businessDate("2099-01-01"),
          taxableAmount: money(500_00n),
          totalTax: money(90_00n),
          grandTotal: money(590_00n),
        }),
      ]
    );
    const projections = createMemoryBusinessStateProjectionRepository();

    const rebuilt = await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      ...(await seededAccounting()),
      projections,
      markRebuilt: true,
    });

    expect(rebuilt.receivablesRisk?.openInvoiceCount).toBe(2);
    expect(rebuilt.receivablesRisk?.overdueInvoiceCount).toBe(1);
    expect(toMajorString(rebuilt.receivablesRisk!.totalOutstanding)).toBe(
      "1770.00"
    );
    expect(rebuilt.salesMomentum?.windowDays).toBe(SALES_MOMENTUM_WINDOW_DAYS);
    expect(rebuilt.salesMomentum?.postedInvoiceCount).toBeGreaterThanOrEqual(1);
    expect(projections.meta.get("tenant-a")?.rebuiltAt).not.toBeNull();
  });

  it("sales momentum excludes posted invoices outside the rolling window", async () => {
    const today = todayInTimezone("Asia/Kolkata");
    expect(today).toBe(businessDate("2026-08-21"));
    const inWindow = addDays(today, -3);
    const outOfWindow = OUT_OF_WINDOW_ISSUED_ON;

    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-in-window",
          tenantId: "tenant-a",
          number: "INV/1",
          status: "POSTED",
          issuedOn: inWindow,
          taxableAmount: money(1000_00n),
          totalTax: money(180_00n),
          grandTotal: money(1180_00n),
        }),
        invoiceFixture({
          id: "inv-out-of-window",
          tenantId: "tenant-a",
          number: "INV/2",
          status: "POSTED",
          issuedOn: outOfWindow,
          taxableAmount: money(9000_00n),
          totalTax: money(1620_00n),
          grandTotal: money(10620_00n),
        }),
      ]
    );
    const projections = createMemoryBusinessStateProjectionRepository();

    const rebuilt = await rebuildBusinessStateProjections({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      ...(await seededAccounting()),
      projections,
      families: ["salesMomentum"],
    });

    expect(rebuilt.salesMomentum?.postedInvoiceCount).toBe(1);
    expect(toMajorString(rebuilt.salesMomentum!.salesTotal)).toBe("1180.00");
    expect(toMajorString(rebuilt.salesMomentum!.taxableTotal)).toBe("1000.00");
  });

  it("outbox consumer upserts projections for posted invoice events", async () => {
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
    const projections = createMemoryBusinessStateProjectionRepository();
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
        ...(await seededAccounting()),
        projections,
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

    const result = await processOutboxConsumers({ outbox });
    expect(result.consumers[0]?.consumerName).toBe(BUSINESS_STATE_CONSUMER_NAME);
    expect(result.totalSucceeded).toBe(1);

    const summary = await getBusinessStateSummary({
      tenantId: "tenant-a",
      projections,
    });
    expect(summary.receivablesRisk?.openInvoiceCount).toBe(1);
    expect(summary.salesMomentum?.postedInvoiceCount).toBe(1);
  });

  it("rejects cross-tenant projection reads", async () => {
    const projections = createMemoryBusinessStateProjectionRepository();
    await projections.upsertReceivablesRisk({
      tenantId: "tenant-b",
      openInvoiceCount: 1,
      overdueInvoiceCount: 0,
      totalOutstanding: money(100_00n),
      overdueOutstanding: money(0n),
      currency: "INR",
      computedAt: new Date(),
    });

    // Direct get is keyed by tenantId — reading tenant-a must not return tenant-b.
    const summary = await getBusinessStateSummary({
      tenantId: "tenant-a",
      projections,
    });
    expect(summary.receivablesRisk).toBeNull();
  });

  it("rebuild is idempotent for the same source data", async () => {
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
    const projections = createMemoryBusinessStateProjectionRepository();
    const deps = {
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      lowStockThresholdMajor: "5.0000",
      sales,
      payments: createMemoryPaymentRepository(),
      catalog: createMemoryCatalogRepository(),
      inventory: createMemoryInventoryRepository(),
      ...(await seededAccounting()),
      projections,
    } as const;

    const first = await rebuildBusinessStateProjections(deps);
    const second = await rebuildBusinessStateProjections(deps);

    expect(toMajorString(first.receivablesRisk!.totalOutstanding)).toBe(
      toMajorString(second.receivablesRisk!.totalOutstanding)
    );
    expect(first.salesMomentum?.postedInvoiceCount).toBe(
      second.salesMomentum?.postedInvoiceCount
    );
  });

  it("commitSnapshots rejects older computedAt snapshots", async () => {
    const projections = createMemoryBusinessStateProjectionRepository();
    const newerAt = new Date("2026-08-21T12:00:00.000Z");
    const olderAt = new Date("2026-08-21T11:00:00.000Z");

    await projections.commitSnapshots({
      tenantId: "tenant-a",
      schemaVersion: BUSINESS_STATE_SCHEMA_VERSION,
      receivablesRisk: {
        tenantId: "tenant-a",
        openInvoiceCount: 2,
        overdueInvoiceCount: 1,
        totalOutstanding: money(200_00n),
        overdueOutstanding: money(100_00n),
        currency: "INR",
        computedAt: newerAt,
      },
    });

    const second = await projections.commitSnapshots({
      tenantId: "tenant-a",
      schemaVersion: BUSINESS_STATE_SCHEMA_VERSION,
      receivablesRisk: {
        tenantId: "tenant-a",
        openInvoiceCount: 9,
        overdueInvoiceCount: 9,
        totalOutstanding: money(999_00n),
        overdueOutstanding: money(999_00n),
        currency: "INR",
        computedAt: olderAt,
      },
    });

    expect(second.appliedFamilies).toBe(0);
    expect(projections.receivables.get("tenant-a")?.openInvoiceCount).toBe(2);
    expect(projections.receivables.get("tenant-a")?.computedAt).toEqual(newerAt);
  });

  it("commitSnapshots is all-or-nothing on failure", async () => {
    const projections = createMemoryBusinessStateProjectionRepository();
    projections.failCommitAfterFamilies = 1;

    await expect(
      projections.commitSnapshots({
        tenantId: "tenant-a",
        schemaVersion: BUSINESS_STATE_SCHEMA_VERSION,
        receivablesRisk: {
          tenantId: "tenant-a",
          openInvoiceCount: 1,
          overdueInvoiceCount: 0,
          totalOutstanding: money(100_00n),
          overdueOutstanding: money(0n),
          currency: "INR",
          computedAt: new Date(),
        },
        inventoryRisk: {
          tenantId: "tenant-a",
          lowStockCount: 3,
          thresholdMajor: "5.0000",
          computedAt: new Date(),
        },
      })
    ).rejects.toThrow("Simulated commit failure");

    expect(projections.receivables.size).toBe(0);
    expect(projections.inventory.size).toBe(0);
    expect(projections.meta.size).toBe(0);
  });

  it("outbox handleBatch coalesces same-tenant events into one commit", async () => {
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
    const projections = createMemoryBusinessStateProjectionRepository();
    let commitCount = 0;
    const originalCommit = projections.commitSnapshots.bind(projections);
    projections.commitSnapshots = async (input) => {
      commitCount += 1;
      return originalCommit(input);
    };

    const outbox = createMemoryOutboxDispatchRepository([
      outboxEvent({
        id: "evt-1",
        tenantId: "tenant-a",
        eventType: "SalesInvoicePosted",
        aggregateId: "inv-1",
      }),
      outboxEvent({
        id: "evt-2",
        tenantId: "tenant-a",
        eventType: "SalesInvoicePosted",
        aggregateId: "inv-1",
      }),
      outboxEvent({
        id: "evt-3",
        tenantId: "tenant-a",
        eventType: "PaymentReceived",
        aggregateId: "pay-1",
        aggregateType: "CustomerPayment",
      }),
    ]);

    registerOutboxConsumer(
      createBusinessStateOutboxConsumer({
        sales,
        payments: createMemoryPaymentRepository(),
        catalog: createMemoryCatalogRepository(),
        inventory: createMemoryInventoryRepository(),
        ...(await seededAccounting()),
        projections,
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

    const result = await processOutboxConsumers({ outbox });
    expect(result.totalSucceeded).toBe(3);
    expect(commitCount).toBe(1);
    expect(projections.receivables.get("tenant-a")?.openInvoiceCount).toBe(1);
  });
});
