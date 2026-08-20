import { describe, expect, it } from "vitest";

import { createMemoryExpenseRepository } from "@/modules/expenses";
import type { Expense } from "@/modules/expenses/domain/types";
import {
  createMemoryPaymentRepository,
  createMemorySupplierPaymentRepository,
} from "@/modules/payments";
import { createMemoryPurchasesRepository } from "@/modules/purchases";
import type { Purchase } from "@/modules/purchases/domain/types";
import {
  getExpenseReport,
  getPayablesReport,
  getProfitReport,
  getReceivablesReport,
  getSalesReport,
  resolveDashboardDateRange,
  salesReportToCsv,
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
  const totalTax = overrides.totalTax ?? money(180_00n);
  const grandTotal =
    overrides.grandTotal ?? money(taxable.amountMinor + totalTax.amountMinor);
  return {
    customerId: "cust-1",
    customerName: "Acme Traders",
    quotationId: null,
    journalId: "jr-1",
    issuedOn: businessDate("2026-08-10"),
    dueOn: businessDate("2026-08-20"),
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

const range = resolveDashboardDateRange({
  timezone: "Asia/Kolkata",
  preset: "custom",
  from: "2026-08-01",
  to: "2026-08-31",
});

describe("business reports (24)", () => {
  it("sales report totals posted invoices in range", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-1",
          tenantId: "tenant-a",
          number: "INV-1",
          status: "UNPAID",
        }),
        invoiceFixture({
          id: "inv-draft",
          tenantId: "tenant-a",
          number: "INV-D",
          status: "DRAFT",
          taxableAmount: money(999_00n),
        }),
        invoiceFixture({
          id: "inv-other",
          tenantId: "tenant-b",
          number: "INV-B",
          status: "UNPAID",
        }),
      ]
    );

    const report = await getSalesReport({
      tenantId: "tenant-a",
      range,
      sales,
    });

    expect(report.invoiceCount).toBe(1);
    expect(toMajorString(report.totalTaxable)).toBe("1000.00");
    expect(salesReportToCsv(report)).toContain("INV-1");
    expect(salesReportToCsv(report)).not.toContain("INV-B");
  });

  it("profit equals taxable sales minus expenses", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-1",
          tenantId: "tenant-a",
          number: "INV-1",
          status: "PAID",
          taxableAmount: money(1000_00n),
          totalTax: money(180_00n),
        }),
      ]
    );
    const expenses = createMemoryExpenseRepository([
      expenseFixture({
        id: "exp-1",
        tenantId: "tenant-a",
        number: "EXP-1",
        taxableAmount: money(250_00n),
        totalTax: money(45_00n),
        grandTotal: money(295_00n),
      }),
    ]);

    const profit = await getProfitReport({
      tenantId: "tenant-a",
      range,
      sales,
      expenses,
    });
    const expenseReport = await getExpenseReport({
      tenantId: "tenant-a",
      range,
      expenses,
    });

    expect(toMajorString(profit.sales)).toBe("1000.00");
    expect(toMajorString(expenseReport.total)).toBe("295.00");
    expect(toMajorString(expenseReport.totalTaxable)).toBe("250.00");
    expect(toMajorString(profit.expenses)).toBe("250.00");
    expect(toMajorString(profit.profit)).toBe("750.00");
  });

  it("receivables match outstanding and exclude other tenants", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-1",
          tenantId: "tenant-a",
          number: "INV-1",
          status: "UNPAID",
          grandTotal: money(1180_00n),
        }),
        invoiceFixture({
          id: "inv-b",
          tenantId: "tenant-b",
          number: "INV-B",
          status: "UNPAID",
          grandTotal: money(5000_00n),
        }),
      ]
    );
    const payments = createMemoryPaymentRepository();

    const report = await getReceivablesReport({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      sales,
      payments,
    });

    expect(report.rowCount).toBe(1);
    expect(report.rows[0]?.invoiceNumber).toBe("INV-1");
    expect(toMajorString(report.totalOutstanding)).toBe("1180.00");
  });

  it("payables match open purchase outstanding", async () => {
    const purchases = createMemoryPurchasesRepository([
      purchaseFixture({
        id: "bill-1",
        tenantId: "tenant-a",
        number: "BILL-1",
        status: "UNPAID",
      }),
      purchaseFixture({
        id: "bill-b",
        tenantId: "tenant-b",
        number: "BILL-B",
        status: "UNPAID",
      }),
    ]);

    const report = await getPayablesReport({
      tenantId: "tenant-a",
      timezone: "Asia/Kolkata",
      purchases,
      supplierPayments: createMemorySupplierPaymentRepository(),
    });

    expect(report.rowCount).toBe(1);
    expect(report.rows[0]?.purchaseNumber).toBe("BILL-1");
    expect(toMajorString(report.totalOutstanding)).toBe("472.00");
  });
});
