import { subtractMoney, isZero } from "@/modules/shared-kernel/money";
import type { BusinessDate } from "@/modules/shared-kernel/dates";
import {
  sumStoredGst,
  zeroStoredGst,
  type StoredGstAmounts,
} from "@/modules/tax/domain/sum-stored-gst";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import type { PurchasesRepository } from "@/modules/purchases/infrastructure/repositories";
import type { ExpenseRepository } from "@/modules/expenses/infrastructure/repositories";
import { gstRowsToCsv } from "@/modules/reporting/domain/csv";
import {
  GST_PURCHASE_STATUSES,
  GST_SALES_STATUSES,
  type GstPeriodSummary,
  type GstTransactionRow,
} from "@/modules/reporting/domain/gst-types";
import { periodDateRange } from "@/modules/reporting/domain/period";

export type GstReportDeps = {
  tenantId: string;
  periodKey: string;
  sales: SalesRepository;
  purchases: PurchasesRepository;
  expenses: ExpenseRepository;
};

function toStored(row: {
  taxableAmount: StoredGstAmounts["taxableAmount"];
  cgst: StoredGstAmounts["cgst"];
  sgst: StoredGstAmounts["sgst"];
  igst: StoredGstAmounts["igst"];
  totalTax: StoredGstAmounts["totalTax"];
}): StoredGstAmounts {
  return {
    taxableAmount: row.taxableAmount,
    cgst: row.cgst,
    sgst: row.sgst,
    igst: row.igst,
    totalTax: row.totalTax,
  };
}

async function loadGstRows(input: {
  tenantId: string;
  fromDate: BusinessDate;
  toDate: BusinessDate;
  sales: SalesRepository;
  purchases: PurchasesRepository;
  expenses: ExpenseRepository;
}): Promise<GstTransactionRow[]> {
  const [invoices, purchases, expenses] = await Promise.all([
    input.sales.listInvoices({
      tenantId: input.tenantId,
      statuses: GST_SALES_STATUSES,
      fromDate: input.fromDate,
      toDate: input.toDate,
    }),
    input.purchases.listPurchases({
      tenantId: input.tenantId,
      statuses: GST_PURCHASE_STATUSES,
      fromDate: input.fromDate,
      toDate: input.toDate,
    }),
    input.expenses.listExpenses({
      tenantId: input.tenantId,
      fromDate: input.fromDate,
      toDate: input.toDate,
    }),
  ]);

  const rows: GstTransactionRow[] = [];

  for (const invoice of invoices) {
    if (invoice.tenantId !== input.tenantId) continue;
    rows.push({
      tenantId: invoice.tenantId,
      documentKind: "SALES_INVOICE",
      taxFlow: "OUTPUT",
      documentId: invoice.id,
      documentNumber: invoice.number,
      businessDate: invoice.issuedOn,
      partyName: invoice.customerName,
      supplyType: invoice.supplyType,
      ...toStored(invoice),
    });
  }

  for (const purchase of purchases) {
    if (purchase.tenantId !== input.tenantId) continue;
    rows.push({
      tenantId: purchase.tenantId,
      documentKind: "PURCHASE",
      taxFlow: "INPUT",
      documentId: purchase.id,
      documentNumber: purchase.number,
      businessDate: purchase.issuedOn,
      partyName: purchase.supplierName,
      supplyType: purchase.supplyType,
      ...toStored(purchase),
    });
  }

  for (const expense of expenses) {
    if (expense.tenantId !== input.tenantId) continue;
    // Spec: expenses if taxed — skip untaxed spend from GST rows.
    if (isZero(expense.totalTax)) continue;
    rows.push({
      tenantId: expense.tenantId,
      documentKind: "EXPENSE",
      taxFlow: "INPUT",
      documentId: expense.id,
      documentNumber: expense.number,
      businessDate: expense.incurredOn,
      partyName: null,
      supplyType: expense.supplyType,
      ...toStored(expense),
    });
  }

  rows.sort((a, b) => {
    const byDate = a.businessDate.localeCompare(b.businessDate);
    if (byDate !== 0) return byDate;
    return a.documentNumber.localeCompare(b.documentNumber);
  });

  return rows;
}

export async function getGstSummary(input: GstReportDeps): Promise<GstPeriodSummary> {
  const { fromDate, toDate } = periodDateRange(input.periodKey);
  const rows = await loadGstRows({
    tenantId: input.tenantId,
    fromDate,
    toDate,
    sales: input.sales,
    purchases: input.purchases,
    expenses: input.expenses,
  });

  const outputRows = rows.filter((row) => row.taxFlow === "OUTPUT");
  const inputRows = rows.filter((row) => row.taxFlow === "INPUT");

  const output =
    outputRows.length > 0
      ? sumStoredGst(outputRows.map(toStored))
      : zeroStoredGst();
  const inputTax =
    inputRows.length > 0
      ? sumStoredGst(inputRows.map(toStored))
      : zeroStoredGst();

  return {
    tenantId: input.tenantId,
    periodKey: input.periodKey,
    fromDate,
    toDate,
    output,
    input: inputTax,
    netTax: subtractMoney(output.totalTax, inputTax.totalTax),
    rows,
  };
}

export async function exportGstCsv(input: GstReportDeps): Promise<{
  filename: string;
  csv: string;
  summary: GstPeriodSummary;
}> {
  const summary = await getGstSummary(input);
  return {
    filename: `gst-summary-${input.periodKey}.csv`,
    csv: gstRowsToCsv(summary.rows),
    summary,
  };
}
