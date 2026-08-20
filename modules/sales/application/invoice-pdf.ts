import { toMajorString } from "@/modules/shared-kernel/money";
import { formatQuantity } from "@/modules/inventory/domain/quantity";
import type { SalesInvoice } from "@/modules/sales/domain/types";

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildContentStream(invoice: SalesInvoice, businessName: string): string {
  const lines = [
    `Tax Invoice ${invoice.number}`,
    businessName,
    `Customer: ${invoice.customerName}`,
    `Date: ${invoice.issuedOn}`,
    invoice.dueOn ? `Due: ${invoice.dueOn}` : "",
    "",
    "Item                          Qty        Amount",
  ];

  for (const line of invoice.lines) {
    const qty = `${formatQuantity(line.quantity)} ${line.unitOfMeasurement}`;
    lines.push(
      `${line.productName.slice(0, 28).padEnd(28)} ${qty.padStart(8)} ${toMajorString(line.lineTotal).padStart(12)}`
    );
  }

  lines.push(
    "",
    `Taxable: INR ${toMajorString(invoice.taxableAmount)}`,
    `CGST: INR ${toMajorString(invoice.cgst)}`,
    `SGST: INR ${toMajorString(invoice.sgst)}`,
    `IGST: INR ${toMajorString(invoice.igst)}`,
    `Total: INR ${toMajorString(invoice.grandTotal)}`
  );

  const textCommands = lines
    .filter(Boolean)
    .map((line, index) => {
      const y = 750 - index * 16;
      return `BT /F1 11 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .join("\n");

  return textCommands;
}

export function renderInvoicePdfBytes(
  invoice: SalesInvoice,
  businessName: string
): Uint8Array {
  const content = buildContentStream(invoice, businessName);
  const contentLength = new TextEncoder().encode(content).length;

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${content}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += object;
  }

  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}
