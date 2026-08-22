import { describe, expect, it } from "vitest";

import { createMemoryExpenseRepository } from "@/modules/expenses";
import type { Expense } from "@/modules/expenses/domain/types";
import { quantityFromMajor } from "@/modules/inventory";
import { createMemoryPurchasesRepository } from "@/modules/purchases";
import type { Purchase } from "@/modules/purchases/domain/types";
import {
  exportGstCsv,
  getGstSummary,
  gstRowsToCsv,
  periodDateRange,
} from "@/modules/reporting";
import { createMemorySalesRepository } from "@/modules/sales";
import type { SalesInvoice } from "@/modules/sales/domain/types";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";
import {
  storedHeaderMatchesLines,
  sumStoredGst,
} from "@/modules/tax";

const zero = money(0n);

function invoiceFixture(
  overrides: Partial<SalesInvoice> & Pick<SalesInvoice, "id" | "tenantId" | "number" | "status">
): SalesInvoice {
  const taxable = overrides.taxableAmount ?? money(1000_00n);
  const cgst = overrides.cgst ?? money(90_00n);
  const sgst = overrides.sgst ?? money(90_00n);
  const igst = overrides.igst ?? zero;
  const totalTax = overrides.totalTax ?? money(cgst.amountMinor + sgst.amountMinor + igst.amountMinor);
  const line = {
    id: `${overrides.id}-line`,
    tenantId: overrides.tenantId,
    invoiceId: overrides.id,
    sortOrder: 0,
    productId: "prod-1",
    productName: "Widget",
    sku: "W-1",
    unitOfMeasurement: "PCS",
    hsnSac: "998314",
    taxRateBps: 1800,
    quantity: quantityFromMajor("1"),
    unitPrice: taxable,
    discount: zero,
    lineSubtotal: taxable,
    taxableAmount: taxable,
    cgst,
    sgst,
    igst,
    totalTax,
    lineTotal: money(taxable.amountMinor + totalTax.amountMinor),
    supplyType: "INTRA_STATE" as const,
    treatment: "STANDARD" as const,
  };

  return {
    customerId: "cust-1",
    customerName: "Acme Traders",
    quotationId: null,
    salesOrderId: null,
    journalId: "jr-1",
    issuedOn: businessDate("2026-08-10"),
    dueOn: null,
    notes: null,
    placeOfSupplyStateCode: "27",
    subtotal: taxable,
    discountTotal: zero,
    taxableAmount: taxable,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal: money(taxable.amountMinor + totalTax.amountMinor),
    supplyType: "INTRA_STATE",
    postedAt: new Date("2026-08-10T10:00:00.000Z"),
    lines: [line],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function purchaseFixture(
  overrides: Partial<Purchase> & Pick<Purchase, "id" | "tenantId" | "number" | "status">
): Purchase {
  const taxable = overrides.taxableAmount ?? money(500_00n);
  const cgst = overrides.cgst ?? money(45_00n);
  const sgst = overrides.sgst ?? money(45_00n);
  const igst = overrides.igst ?? zero;
  const totalTax = overrides.totalTax ?? money(cgst.amountMinor + sgst.amountMinor + igst.amountMinor);
  const line = {
    id: `${overrides.id}-line`,
    tenantId: overrides.tenantId,
    purchaseId: overrides.id,
    sortOrder: 0,
    productId: "prod-2",
    productName: "Parts",
    sku: "P-1",
    unitOfMeasurement: "PCS",
    hsnSac: "998314",
    taxRateBps: 1800,
    quantity: quantityFromMajor("1"),
    unitPrice: taxable,
    discount: zero,
    lineSubtotal: taxable,
    taxableAmount: taxable,
    cgst,
    sgst,
    igst,
    totalTax,
    lineTotal: money(taxable.amountMinor + totalTax.amountMinor),
    supplyType: "INTRA_STATE" as const,
    treatment: "STANDARD" as const,
  };

  return {
    supplierId: "sup-1",
    supplierName: "Supply Co",
    journalId: "jr-2",
    issuedOn: businessDate("2026-08-12"),
    dueOn: null,
    notes: null,
    placeOfSupplyStateCode: "27",
    subtotal: taxable,
    discountTotal: zero,
    taxableAmount: taxable,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal: money(taxable.amountMinor + totalTax.amountMinor),
    supplyType: "INTRA_STATE",
    postedAt: new Date("2026-08-12T10:00:00.000Z"),
    lines: [line],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function expenseFixture(
  overrides: Partial<Expense> & Pick<Expense, "id" | "tenantId" | "number">
): Expense {
  const taxable = overrides.taxableAmount ?? money(200_00n);
  const cgst = overrides.cgst ?? money(18_00n);
  const sgst = overrides.sgst ?? money(18_00n);
  const igst = overrides.igst ?? zero;
  const totalTax =
    overrides.totalTax ?? money(cgst.amountMinor + sgst.amountMinor + igst.amountMinor);

  return {
    category: "OFFICE",
    incurredOn: businessDate("2026-08-15"),
    method: "UPI",
    vendorGstin: null,
    notes: null,
    taxableAmount: taxable,
    taxRateBps: 1800,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal: money(taxable.amountMinor + totalTax.amountMinor),
    supplyType: "INTRA_STATE",
    treatment: "STANDARD",
    journalId: "jr-3",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GST reporting", () => {
  it("summarizes output and input tax for a period from stored document breakdowns", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-1",
          tenantId: "tenant-a",
          number: "INV/FY2026-27/0001",
          status: "UNPAID",
        }),
        invoiceFixture({
          id: "inv-draft",
          tenantId: "tenant-a",
          number: "INV/FY2026-27/0002",
          status: "DRAFT",
          taxableAmount: money(999_00n),
          cgst: money(89_91n),
          sgst: money(89_91n),
          totalTax: money(179_82n),
        }),
        invoiceFixture({
          id: "inv-other-month",
          tenantId: "tenant-a",
          number: "INV/FY2026-27/0003",
          status: "PAID",
          issuedOn: businessDate("2026-07-20"),
        }),
      ]
    );
    const purchases = createMemoryPurchasesRepository([
      purchaseFixture({
        id: "bill-1",
        tenantId: "tenant-a",
        number: "BILL/FY2026-27/0001",
        status: "UNPAID",
      }),
    ]);
    const expenses = createMemoryExpenseRepository([
      expenseFixture({
        id: "exp-1",
        tenantId: "tenant-a",
        number: "EXP/FY2026-27/0001",
      }),
      expenseFixture({
        id: "exp-untaxed",
        tenantId: "tenant-a",
        number: "EXP/FY2026-27/0002",
        taxableAmount: money(100_00n),
        taxRateBps: 0,
        cgst: zero,
        sgst: zero,
        igst: zero,
        totalTax: zero,
        grandTotal: money(100_00n),
        supplyType: "NONE",
        treatment: "EXEMPT",
      }),
    ]);

    const summary = await getGstSummary({
      tenantId: "tenant-a",
      periodKey: "2026-08",
      sales,
      purchases,
      expenses,
    });

    expect(summary.fromDate).toBe("2026-08-01");
    expect(summary.toDate).toBe("2026-08-31");
    expect(summary.rows).toHaveLength(3);
    expect(toMajorString(summary.output.taxableAmount)).toBe("1000.00");
    expect(toMajorString(summary.output.totalTax)).toBe("180.00");
    expect(toMajorString(summary.input.taxableAmount)).toBe("700.00");
    expect(toMajorString(summary.input.totalTax)).toBe("126.00");
    expect(toMajorString(summary.netTax)).toBe("54.00");

    const expectedOutput = sumStoredGst([
      {
        taxableAmount: money(1000_00n),
        cgst: money(90_00n),
        sgst: money(90_00n),
        igst: zero,
        totalTax: money(180_00n),
      },
    ]);
    expect(summary.output.totalTax.amountMinor).toBe(expectedOutput.totalTax.amountMinor);

    const invoice = sales.invoices.find((row) => row.id === "inv-1")!;
    expect(storedHeaderMatchesLines(invoice, invoice.lines)).toBe(true);
  });

  it("keeps export and summary tenant-scoped", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-a",
          tenantId: "tenant-a",
          number: "INV-A",
          status: "PAID",
        }),
        invoiceFixture({
          id: "inv-b",
          tenantId: "tenant-b",
          number: "INV-B",
          status: "PAID",
          taxableAmount: money(5000_00n),
          cgst: money(450_00n),
          sgst: money(450_00n),
          totalTax: money(900_00n),
        }),
      ]
    );
    const purchases = createMemoryPurchasesRepository([]);
    const expenses = createMemoryExpenseRepository([]);

    const summary = await getGstSummary({
      tenantId: "tenant-a",
      periodKey: "2026-08",
      sales,
      purchases,
      expenses,
    });
    expect(summary.rows).toHaveLength(1);
    expect(summary.rows[0]!.tenantId).toBe("tenant-a");
    expect(toMajorString(summary.output.taxableAmount)).toBe("1000.00");

    const { csv, filename } = await exportGstCsv({
      tenantId: "tenant-a",
      periodKey: "2026-08",
      sales,
      purchases,
      expenses,
    });
    expect(filename).toBe("gst-summary-2026-08.csv");
    expect(csv).toContain("INV-A");
    expect(csv).not.toContain("INV-B");
    expect(csv).toContain("SALES_INVOICE");
    expect(csv).toContain("OUTPUT");
  });

  it("maps period keys to inclusive date ranges", () => {
    expect(periodDateRange("2026-02")).toEqual({
      fromDate: "2026-02-01",
      toDate: "2026-02-28",
    });
    expect(gstRowsToCsv([])).toContain("document_kind");
  });

  it("includes posted credit notes as negative output GST", async () => {
    const sales = createMemorySalesRepository(
      [],
      [
        invoiceFixture({
          id: "inv-1",
          tenantId: "tenant-a",
          number: "INV/FY2026-27/0001",
          status: "UNPAID",
        }),
      ]
    );
    const taxable = money(400_00n);
    const tax = money(72_00n);
    sales.creditNotes.push({
      id: "cn-1",
      tenantId: "tenant-a",
      number: "CN/FY2026-27/0001",
      customerId: "cust-1",
      customerName: "Acme Traders",
      invoiceId: "inv-1",
      invoiceNumber: "INV/FY2026-27/0001",
      status: "POSTED",
      journalId: "jr-cn",
      issuedOn: businessDate("2026-08-15"),
      notes: null,
      placeOfSupplyStateCode: "27",
      subtotal: taxable,
      discountTotal: zero,
      taxableAmount: taxable,
      cgst: money(36_00n),
      sgst: money(36_00n),
      igst: zero,
      totalTax: tax,
      grandTotal: money(472_00n),
      supplyType: "INTRA_STATE",
      postedAt: new Date("2026-08-15T10:00:00.000Z"),
      lines: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const summary = await getGstSummary({
      tenantId: "tenant-a",
      periodKey: "2026-08",
      sales,
      purchases: createMemoryPurchasesRepository([]),
      expenses: createMemoryExpenseRepository([]),
    });
    const creditRow = summary.rows.find((row) => row.documentKind === "SALES_CREDIT_NOTE");
    expect(creditRow).toBeDefined();
    expect(toMajorString(creditRow!.taxableAmount)).toBe("-400.00");
    expect(toMajorString(summary.output.taxableAmount)).toBe("600.00");
  });
});
