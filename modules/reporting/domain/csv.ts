import { toMajorString } from "@/modules/shared-kernel/money";

import type { GstTransactionRow } from "@/modules/reporting/domain/gst-types";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const HEADERS = [
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
  const lines = [HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.documentKind,
        row.taxFlow,
        csvEscape(row.documentNumber),
        row.businessDate,
        csvEscape(row.partyName ?? ""),
        row.supplyType,
        toMajorString(row.taxableAmount),
        toMajorString(row.cgst),
        toMajorString(row.sgst),
        toMajorString(row.igst),
        toMajorString(row.totalTax),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
