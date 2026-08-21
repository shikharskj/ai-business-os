import { afterEach, describe, expect, it } from "vitest";

import {
  clearOutboxConsumers,
  createMemoryOutboxDispatchRepository,
  processOutboxConsumers,
  registerOutboxConsumer,
  type OutboxEventRecord,
} from "@/modules/events";
import {
  BUSINESS_STATE_CONSUMER_NAME,
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
import type { SalesInvoice } from "@/modules/sales/domain/types";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";

const zero = money(0n);

function invoiceFixture(
  overrides: Partial<SalesInvoice> &
    Pick<SalesInvoice, "id" | "tenantId" | "number" | "status">
): SalesInvoice {
  const taxable = overrides.taxableAmount ?? money(1000_00n);
  const totalTax = overrides.totalTax ?? money(180_00n);
  const grandTotal =
    overrides.grandTotal ?? money(taxable.amountMinor + totalTax.amountMinor);
  return {
    customerId: "cust-1",
    customerName: "Acme",
    quotationId: null,
    journalId: "jr-1",
    issuedOn: businessDate("2026-08-10"),
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
    postedAt: new Date("2026-08-10T10:00:00.000Z"),
    lines: [],
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

describe("business state projections (post-mvp 02)", () => {
  afterEach(() => {
    clearOutboxConsumers();
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
});
