import { describe, expect, it } from "vitest";

import {
  assertViewCitesFacts,
  FactCitationError,
  parseDashboardView,
} from "@/modules/ai";
import {
  runAnomalyScout,
  runDataAnalyst,
  runDashboardSupervisor,
  runGenerativeUiMapper,
} from "@/modules/ai/server";
import { createMemoryCatalogRepository } from "@/modules/catalog";
import { createMemoryExpenseRepository } from "@/modules/expenses";
import type { Expense } from "@/modules/expenses/domain/types";
import { createMemoryInventoryRepository } from "@/modules/inventory";
import {
  createMemoryPaymentRepository,
  createMemorySupplierPaymentRepository,
} from "@/modules/payments";
import { createMemoryPurchasesRepository } from "@/modules/purchases";
import { resolveDashboardDateRange } from "@/modules/reporting";
import { createMemorySalesRepository } from "@/modules/sales";
import type { SalesInvoice } from "@/modules/sales/domain/types";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";
import { runDataFetcher } from "@/modules/ai/application/workers/data-fetcher";

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
    customerName: "Acme Traders",
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
    postedAt: new Date(),
    lines: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function expenseFixture(
  overrides: Partial<Expense> & Pick<Expense, "id" | "tenantId" | "number">
): Expense {
  const grandTotal = overrides.grandTotal ?? money(250_00n);
  return {
    category: "OFFICE",
    incurredOn: businessDate("2026-08-12"),
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
    journalId: "jr-3",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function deps(tenantId = "tenant-a") {
  return {
    tenantId,
    timezone: "Asia/Kolkata",
    lowStockThresholdMajor: "5",
    range: resolveDashboardDateRange({
      timezone: "Asia/Kolkata",
      preset: "custom",
      from: "2026-08-01",
      to: "2026-08-31",
    }),
    sales: createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-1",
          tenantId,
          number: "INV-1",
          status: "UNPAID",
        }),
      ]
    ),
    purchases: createMemoryPurchasesRepository(),
    expenses: createMemoryExpenseRepository([
      expenseFixture({ id: "exp-1", tenantId, number: "EXP-1" }),
    ]),
    payments: createMemoryPaymentRepository(),
    supplierPayments: createMemorySupplierPaymentRepository(),
    catalog: createMemoryCatalogRepository(),
    inventory: createMemoryInventoryRepository(),
  };
}

describe("supervisor-led dashboard", () => {
  it("builds a schema-valid Dashboard-01 view with cited facts", async () => {
    const result = await runDashboardSupervisor({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      intent: { kind: "overview", range: deps().range },
      deps: deps(),
    });

    expect(result.usedFallback).toBe(false);
    expect(result.view.version).toBe(1);
    expect(result.view.source).toBe("supervisor");
    const kpi = result.view.regions.find((r) => r.id === "kpi");
    expect(kpi?.components).toHaveLength(8);
    expect(kpi?.components.every((c) => c.type === "MetricCard")).toBe(true);
    const kpiIds = kpi?.components.map((c) => c.id) ?? [];
    expect(kpiIds).toEqual(
      expect.arrayContaining([
        "kpi.sales",
        "kpi.expenses",
        "kpi.profit",
        "kpi.receivables",
        "kpi.payables",
        "kpi.overdue",
        "kpi.receipts",
        "kpi.paymentsOut",
      ])
    );
    expect(result.audit.factCount).toBeGreaterThan(0);
    expect(result.view.regions.some((r) => r.id === "insights")).toBe(true);

    const activity = result.view.regions
      .flatMap((r) => r.components)
      .find((c) => c.type === "ActivityList");
    expect(activity?.type).toBe("ActivityList");
    if (activity?.type === "ActivityList") {
      const ids = activity.items.map((item) => item.id);
      expect(ids).toContain("inv-1");
      expect(ids).toContain("exp-1");
      expect(
        activity.items.every(
          (item) =>
            item.amount?.factId === `fact.invoice.${item.id}` ||
            item.amount?.factId === `fact.expense.${item.id}`
        )
      ).toBe(true);
    }

    assertViewCitesFacts(result.view, await runDataFetcher({
      tenantId: "tenant-a",
      deps: deps(),
    }));
  });

  it("rejects views that invent uncited money facts", async () => {
    const facts = await runDataFetcher({
      tenantId: "tenant-a",
      deps: deps(),
    });
    const view = runGenerativeUiMapper({
      facts,
      insights: runDataAnalyst(facts),
      anomalies: runAnomalyScout(facts),
      source: "supervisor",
    });
    const bad = structuredClone(view);
    const metric = bad.regions
      .flatMap((r) => r.components)
      .find((c) => c.type === "MetricCard");
    if (metric && metric.type === "MetricCard") {
      metric.value.factId = "fact.invented";
    }
    expect(() => assertViewCitesFacts(parseDashboardView(bad), facts)).toThrow(
      FactCitationError
    );
  });

  it("refuses cross-tenant supervisor deps", async () => {
    await expect(
      runDashboardSupervisor({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        intent: { kind: "overview", range: deps().range },
        deps: deps("tenant-b"),
      })
    ).rejects.toThrow(/cross-tenant/);
  });

  it("surfaces overdue anomalies from authoritative facts", async () => {
    const facts = await runDataFetcher({
      tenantId: "tenant-a",
      deps: deps(),
    });
    const anomalies = runAnomalyScout(facts);
    expect(anomalies.anomalies.some((a) => a.id === "anomaly.overdue")).toBe(
      true
    );
  });

  it("emits expense money facts for recent expenses", async () => {
    const facts = await runDataFetcher({
      tenantId: "tenant-a",
      deps: deps(),
    });
    const expenseFact = facts.facts.find((f) => f.id === "fact.expense.exp-1");
    expect(expenseFact?.kind).toBe("money");
    expect(expenseFact?.href).toBe("/app/expenses/exp-1");
  });

  it("does not show Welcome empty state when only recent expenses exist", async () => {
    // Quiet period (zero KPIs) but older expenses still appear in activity.
    const quietRangeDeps = {
      ...deps(),
      range: resolveDashboardDateRange({
        timezone: "Asia/Kolkata",
        preset: "custom",
        from: "2026-07-01",
        to: "2026-07-31",
      }),
      sales: createMemorySalesRepository([], []),
      expenses: createMemoryExpenseRepository([
        expenseFixture({
          id: "exp-old",
          tenantId: "tenant-a",
          number: "EXP-OLD",
          incurredOn: businessDate("2026-08-12"),
        }),
      ]),
    };
    const facts = await runDataFetcher({
      tenantId: "tenant-a",
      deps: quietRangeDeps,
    });
    expect(facts.overview.expenses.amountMinor).toBe(0n);
    expect(facts.overview.recentInvoices).toHaveLength(0);
    expect(facts.overview.recentExpenses).toHaveLength(1);

    const view = runGenerativeUiMapper({
      facts,
      insights: runDataAnalyst(facts),
      anomalies: runAnomalyScout(facts),
      source: "fallback",
    });

    const emptyRegion = view.regions.find((r) => r.id === "empty");
    expect(emptyRegion?.components).toEqual([]);

    const activity = view.regions
      .flatMap((r) => r.components)
      .find((c) => c.type === "ActivityList");
    expect(activity?.type).toBe("ActivityList");
    if (activity?.type === "ActivityList") {
      expect(activity.items.map((item) => item.id)).toContain("exp-old");
    }
  });
});
