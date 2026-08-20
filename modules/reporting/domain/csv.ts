import { toMajorString } from "@/modules/shared-kernel/money";

import type {
  ExpenseReport,
  InventoryReport,
  PayablesReport,
  ProfitReport,
  ReceivablesReport,
  SalesReport,
} from "@/modules/reporting/domain/business-report-types";
import type { GstTransactionRow } from "@/modules/reporting/domain/gst-types";

export function csvEscape(value: string): string {
  // Prefix single quote for formula injection prevention
  if (/^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`;
  }
  // Apply RFC 4180 quoting and quote-doubling
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(
  headers: readonly string[],
  rows: readonly (readonly string[])[]
): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => csvEscape(cell)).join(","));
  }
  return `${lines.join("\n")}\n`;
}

const GST_HEADERS = [
  "document_kind",
  "tax_flow",
  "document_number",
  "business_date",
  "party_name",
  "supply_type",
  "taxable_amount",
  "cgst",
  "sgst",
  "igst",
  "total_tax",
] as const;

export function gstRowsToCsv(rows: readonly GstTransactionRow[]): string {
  return rowsToCsv(
    GST_HEADERS,
    rows.map((row) => [
      row.documentKind,
      row.taxFlow,
      row.documentNumber,
      row.businessDate,
      row.partyName ?? "",
      row.supplyType,
      toMajorString(row.taxableAmount),
      toMajorString(row.cgst),
      toMajorString(row.sgst),
      toMajorString(row.igst),
      toMajorString(row.totalTax),
    ])
  );
}

export function salesReportToCsv(report: SalesReport): string {
  return rowsToCsv(
    [
      "invoice_number",
      "customer_name",
      "issued_on",
      "status",
      "taxable_amount",
      "total_tax",
      "grand_total",
    ],
    report.rows.map((row) => [
      row.number,
      row.customerName,
      row.issuedOn,
      row.status,
      toMajorString(row.taxableAmount),
      toMajorString(row.totalTax),
      toMajorString(row.grandTotal),
    ])
  );
}

export function expenseReportToCsv(report: ExpenseReport): string {
  return rowsToCsv(
    [
      "expense_number",
      "category",
      "incurred_on",
      "method",
      "total_tax",
      "grand_total",
    ],
    report.rows.map((row) => [
      row.number,
      row.categoryLabel,
      row.incurredOn,
      row.method,
      toMajorString(row.totalTax),
      toMajorString(row.grandTotal),
    ])
  );
}

export function profitReportToCsv(report: ProfitReport): string {
  return rowsToCsv(
    ["from_date", "to_date", "label", "sales_taxable", "expenses", "profit"],
    [
      [
        report.range.fromDate,
        report.range.toDate,
        report.range.label,
        toMajorString(report.sales),
        toMajorString(report.expenses),
        toMajorString(report.profit),
      ],
    ]
  );
}

export function receivablesReportToCsv(report: ReceivablesReport): string {
  return rowsToCsv(
    [
      "invoice_number",
      "customer_name",
      "status",
      "issued_on",
      "due_on",
      "grand_total",
      "allocated",
      "outstanding",
    ],
    report.rows.map((row) => [
      row.invoiceNumber,
      row.customerName,
      row.status,
      row.issuedOn,
      row.dueOn ?? "",
      toMajorString(row.grandTotal),
      toMajorString(row.allocated),
      toMajorString(row.outstanding),
    ])
  );
}

export function payablesReportToCsv(report: PayablesReport): string {
  return rowsToCsv(
    [
      "bill_number",
      "supplier_name",
      "status",
      "issued_on",
      "due_on",
      "grand_total",
      "allocated",
      "outstanding",
    ],
    report.rows.map((row) => [
      row.purchaseNumber,
      row.supplierName,
      row.status,
      row.issuedOn,
      row.dueOn ?? "",
      toMajorString(row.grandTotal),
      toMajorString(row.allocated),
      toMajorString(row.outstanding),
    ])
  );
}

export function inventoryReportToCsv(report: InventoryReport): string {
  return rowsToCsv(
    ["product_name", "sku", "quantity", "low_stock"],
    report.rows.map((row) => [
      row.name,
      row.sku ?? "",
      row.quantityMajor,
      row.isLowStock ? "yes" : "no",
    ])
  );
}
