import { describe, expect, it } from "vitest";

import { createMemoryCatalogRepository } from "@/modules/catalog";
import { createMemoryExpenseRepository } from "@/modules/expenses";
import type { Expense } from "@/modules/expenses/domain/types";
import { createMemoryInventoryRepository } from "@/modules/inventory";
import {
  createMemoryPaymentRepository,
  createMemorySupplierPaymentRepository,
} from "@/modules/payments";
import { createMemoryPurchasesRepository } from "@/modules/purchases";
import type { Purchase } from "@/modules/purchases/domain/types";
import {
  getDashboardOverview,
  getPeriodActivity,
  previousDashboardDateRange,
  resolveDashboardDateRange,
} from "@/modules/reporting";
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
  const cgst = overrides.cgst ?? money(90_00n);
  const sgst = overrides.sgst ?? money(90_00n);
  const igst = overrides.igst ?? zero;
  const totalTax =
    overrides.totalTax ?? money(cgst.amountMinor + sgst.amountMinor + igst.amountMinor);
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
    cgst,
    sgst,
    igst,
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

function purchaseFixture(
  overrides: Partial<Purchase> &
    Pick<Purchase, "id" | "tenantId" | "number" | "status">
): Purchase {
  const taxable = overrides.taxableAmount ?? money(400_00n);
  const totalTax = overrides.totalTax ?? money(72_00n);
  return {
    supplierId: "sup-1",
    supplierName: "Supply Co",
    journalId: "jr-2",
    issuedOn: businessDate("2026-08-05"),
    dueOn: null,
    notes: null,
    placeOfSupplyStateCode: "27",
    subtotal: taxable,
    discountTotal: zero,
    taxableAmount: taxable,
    cgst: money(36_00n),
    sgst: money(36_00n),
    igst: zero,
    totalTax,
    grandTotal: money(taxable.amountMinor + totalTax.amountMinor),
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

function emptyDeps(tenantId = "tenant-a") {
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
    sales: createMemorySalesRepository(),
    purchases: createMemoryPurchasesRepository(),
    expenses: createMemoryExpenseRepository(),
    payments: createMemoryPaymentRepository(),
    supplierPayments: createMemorySupplierPaymentRepository(),
    catalog: createMemoryCatalogRepository(),
    inventory: createMemoryInventoryRepository(),
  };
}

describe("dashboard overview", () => {
  it("returns zeros and empty lists for a new business", async () => {
    const overview = await getDashboardOverview(emptyDeps());
    expect(toMajorString(overview.revenue)).toBe("0.00");
    expect(toMajorString(overview.expenses)).toBe("0.00");
    expect(toMajorString(overview.profit)).toBe("0.00");
    expect(toMajorString(overview.receivables)).toBe("0.00");
    expect(toMajorString(overview.payables)).toBe("0.00");
    expect(overview.recentInvoices).toHaveLength(0);
    expect(overview.recentExpenses).toHaveLength(0);
    expect(overview.alerts).toHaveLength(0);
    expect(overview.lowStockCount).toBe(0);
  });

  it("matches KPIs to seeded invoices, expenses, and open balances", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-1",
          tenantId: "tenant-a",
          number: "INV-1",
          status: "UNPAID",
          taxableAmount: money(1000_00n),
          cgst: money(90_00n),
          sgst: money(90_00n),
          totalTax: money(180_00n),
          grandTotal: money(1180_00n),
          dueOn: businessDate("2026-08-01"),
        }),
        invoiceFixture({
          id: "inv-draft",
          tenantId: "tenant-a",
          number: "INV-DRAFT",
          status: "DRAFT",
          taxableAmount: money(5000_00n),
          grandTotal: money(5900_00n),
        }),
      ]
    );
    const purchases = createMemoryPurchasesRepository([
      purchaseFixture({
        id: "bill-1",
        tenantId: "tenant-a",
        number: "BILL-1",
        status: "UNPAID",
        taxableAmount: money(400_00n),
        totalTax: money(72_00n),
        grandTotal: money(472_00n),
      }),
    ]);
    const expenses = createMemoryExpenseRepository([
      expenseFixture({
        id: "exp-1",
        tenantId: "tenant-a",
        number: "EXP-1",
        grandTotal: money(250_00n),
      }),
    ]);

    const overview = await getDashboardOverview({
      ...emptyDeps(),
      sales,
      purchases,
      expenses,
    });

    expect(toMajorString(overview.revenue)).toBe("1000.00");
    expect(toMajorString(overview.expenses)).toBe("250.00");
    expect(toMajorString(overview.profit)).toBe("750.00");
    expect(toMajorString(overview.receivables)).toBe("1180.00");
    expect(toMajorString(overview.payables)).toBe("472.00");
    expect(overview.overdueInvoiceCount).toBe(1);
    expect(toMajorString(overview.overdueOutstanding)).toBe("1180.00");
    expect(overview.recentInvoices).toHaveLength(1);
    expect(overview.recentExpenses).toHaveLength(1);
    expect(overview.alerts.some((a) => a.kind === "OVERDUE_INVOICE")).toBe(true);
  });

  it("does not mix tenants in dashboard totals", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-a",
          tenantId: "tenant-a",
          number: "INV-A",
          status: "PAID",
          taxableAmount: money(100_00n),
          grandTotal: money(118_00n),
          dueOn: null,
        }),
        invoiceFixture({
          id: "inv-b",
          tenantId: "tenant-b",
          number: "INV-B",
          status: "UNPAID",
          taxableAmount: money(9000_00n),
          grandTotal: money(10620_00n),
        }),
      ]
    );

    const overview = await getDashboardOverview({
      ...emptyDeps("tenant-a"),
      sales,
    });

    expect(toMajorString(overview.revenue)).toBe("100.00");
    expect(overview.recentInvoices.map((row) => row.number)).toEqual(["INV-A"]);
    expect(toMajorString(overview.receivables)).toBe("0.00");
  });

  it("resolves this_month from business timezone", () => {
    const range = resolveDashboardDateRange({
      timezone: "Asia/Kolkata",
      preset: "this_month",
    });
    expect(range.preset).toBe("this_month");
    expect(range.fromDate.endsWith("-01")).toBe(true);
    expect(range.fromDate <= range.toDate).toBe(true);
  });

  it("defaults to last_3_months when preset is omitted", () => {
    const range = resolveDashboardDateRange({
      timezone: "Asia/Kolkata",
    });
    expect(range.preset).toBe("last_3_months");
    expect(range.label).toBe("Last 3 months");
    expect(range.fromDate < range.toDate).toBe(true);
  });

  it("resolves last_7_days as an inclusive 7-day window", () => {
    const range = resolveDashboardDateRange({
      timezone: "Asia/Kolkata",
      preset: "last_7_days",
    });
    expect(range.preset).toBe("last_7_days");
    const from = new Date(`${range.fromDate}T00:00:00Z`);
    const to = new Date(`${range.toDate}T00:00:00Z`);
    const daySpan =
      Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    expect(daySpan).toBe(7);
  });

  it("resolves last_30_days as an inclusive 30-day window", () => {
    const range = resolveDashboardDateRange({
      timezone: "Asia/Kolkata",
      preset: "last_30_days",
    });
    expect(range.preset).toBe("last_30_days");
    const from = new Date(`${range.fromDate}T00:00:00Z`);
    const to = new Date(`${range.toDate}T00:00:00Z`);
    const daySpan =
      Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    expect(daySpan).toBe(30);
  });
});

describe("period activity snapshot", () => {
  it("includes only the requested day's sales, collections, and expenses", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-yesterday",
          tenantId: "tenant-a",
          number: "INV-Y",
          status: "UNPAID",
          issuedOn: businessDate("2026-08-21"),
          taxableAmount: money(400_00n),
          grandTotal: money(472_00n),
        }),
        invoiceFixture({
          id: "inv-today",
          tenantId: "tenant-a",
          number: "INV-T",
          status: "UNPAID",
          issuedOn: businessDate("2026-08-22"),
          taxableAmount: money(9000_00n),
          grandTotal: money(10620_00n),
        }),
      ]
    );
    const expenses = createMemoryExpenseRepository([
      expenseFixture({
        id: "exp-yesterday",
        tenantId: "tenant-a",
        number: "EXP-Y",
        incurredOn: businessDate("2026-08-21"),
        grandTotal: money(50_00n),
      }),
      expenseFixture({
        id: "exp-today",
        tenantId: "tenant-a",
        number: "EXP-T",
        incurredOn: businessDate("2026-08-22"),
        grandTotal: money(800_00n),
      }),
    ]);
    const payments = createMemoryPaymentRepository();
    await payments.createPayment({
      id: "pay-y",
      tenantId: "tenant-a",
      number: "RCPT/Y",
      customerId: "cust-1",
      customerName: "Acme Traders",
      receivedOn: businessDate("2026-08-21"),
      method: "UPI",
      amount: money(100_00n),
      reference: null,
      notes: null,
      journalId: "jr-pay",
      allocations: [],
    });
    await payments.createPayment({
      id: "pay-t",
      tenantId: "tenant-a",
      number: "RCPT/T",
      customerId: "cust-1",
      customerName: "Acme Traders",
      receivedOn: businessDate("2026-08-22"),
      method: "UPI",
      amount: money(500_00n),
      reference: null,
      notes: null,
      journalId: "jr-pay-2",
      allocations: [],
    });

    const snapshot = await getPeriodActivity({
      tenantId: "tenant-a",
      fromDate: businessDate("2026-08-21"),
      toDate: businessDate("2026-08-21"),
      sales,
      payments,
      expenses,
    });

    expect(toMajorString(snapshot.sales)).toBe("400.00");
    expect(toMajorString(snapshot.collections)).toBe("100.00");
    expect(toMajorString(snapshot.expenses)).toBe("50.00");
  });
});

describe("previous dashboard range (07)", () => {
  it("compares this month to the matching month-to-date last month", () => {
    expect(
      previousDashboardDateRange({
        preset: "this_month",
        fromDate: businessDate("2026-08-01"),
        toDate: businessDate("2026-08-22"),
        label: "This month",
      })
    ).toMatchObject({
      fromDate: "2026-07-01",
      toDate: "2026-07-22",
      label: "Previous period",
    });
  });

  it("clamps the prior month when the current day does not exist", () => {
    expect(
      previousDashboardDateRange({
        preset: "this_month",
        fromDate: businessDate("2026-03-01"),
        toDate: businessDate("2026-03-31"),
        label: "This month",
      }).toDate
    ).toBe("2026-02-28");
  });

  it("uses an equal-length window for rolling day presets", () => {
    expect(
      previousDashboardDateRange({
        preset: "last_7_days",
        fromDate: businessDate("2026-08-16"),
        toDate: businessDate("2026-08-22"),
        label: "Last 7 days",
      })
    ).toMatchObject({
      fromDate: "2026-08-09",
      toDate: "2026-08-15",
    });
  });
});
