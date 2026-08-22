import "server-only";
import PDFDocument from "pdfkit";

import type { QuotationDocumentView } from "@/modules/sales/application/quotation-document-view";
import {
  INVOICE_DOCUMENT_CONTENT_WIDTH,
  INVOICE_DOCUMENT_LAYOUT,
  INVOICE_DOCUMENT_PAPER,
} from "@/modules/sales/application/invoice-document-theme";

const { pageMargin: PAGE_MARGIN, logoSize: LOGO_SIZE } = INVOICE_DOCUMENT_LAYOUT;
const CONTENT_WIDTH = INVOICE_DOCUMENT_CONTENT_WIDTH;
const paper = INVOICE_DOCUMENT_PAPER;

function canEmbedLogo(contentType: string): boolean {
  return contentType === "image/jpeg" || contentType === "image/png";
}

function drawLettermark(
  doc: PDFKit.PDFDocument,
  lettermark: string,
  x: number,
  y: number
) {
  const size = LOGO_SIZE;
  const radius = INVOICE_DOCUMENT_LAYOUT.lettermarkRadius;
  doc.roundedRect(x, y, size, size, radius).fill(paper.primary);
  doc
    .fillColor(paper.onPrimary)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(lettermark, x, y + size / 2 - 6, {
      width: size,
      align: "center",
    });
  doc.font("Helvetica");
}

function drawParty(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  party: QuotationDocumentView["seller"]
): number {
  doc
    .strokeColor(paper.border)
    .moveTo(x, y)
    .lineTo(x, y + 8)
    .stroke();

  const textX = x + 8;
  const textWidth = width - 8;
  doc
    .fontSize(8)
    .fillColor(paper.muted)
    .text(label.toUpperCase(), textX, y, { width: textWidth });
  let cursor = y + 12;
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(paper.foreground)
    .text(party.name, textX, cursor, { width: textWidth });
  doc.font("Helvetica");
  cursor = doc.y + 2;
  doc.fontSize(8).fillColor(paper.mutedBody);
  for (const line of party.addressLines) {
    doc.text(line, textX, cursor, { width: textWidth });
    cursor = doc.y;
  }
  if (party.gstin) {
    doc
      .fillColor(paper.foreground)
      .text(`GSTIN ${party.gstin}`, textX, cursor, { width: textWidth });
    cursor = doc.y;
  }
  if (party.phone) {
    doc
      .fillColor(paper.mutedBody)
      .text(party.phone, textX, cursor, { width: textWidth });
    cursor = doc.y;
  }
  if (party.email) {
    doc
      .fillColor(paper.mutedBody)
      .text(party.email, textX, cursor, { width: textWidth });
    cursor = doc.y;
  }
  return cursor;
}

export async function renderQuotationPdfBytes(
  view: QuotationDocumentView,
  logo?: { bytes: Uint8Array; contentType: string } | null
): Promise<Uint8Array> {
  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    compress: false,
    info: {
      Title: `${view.title} ${view.number}`,
      Author: view.seller.name,
    },
  });

  const chunks: Buffer[] = [];
  const finished = new Promise<Uint8Array>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Uint8Array.from(Buffer.concat(chunks)));
    });
    doc.on("error", reject);
  });

  const logoBuffer =
    logo && canEmbedLogo(logo.contentType) ? Buffer.from(logo.bytes) : null;

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, PAGE_MARGIN, PAGE_MARGIN, {
        fit: [LOGO_SIZE, LOGO_SIZE],
      });
    } catch {
      drawLettermark(doc, view.lettermark, PAGE_MARGIN, PAGE_MARGIN);
    }
  } else {
    drawLettermark(doc, view.lettermark, PAGE_MARGIN, PAGE_MARGIN);
  }

  doc
    .fillColor(paper.muted)
    .fontSize(8)
    .text(view.title.toUpperCase(), PAGE_MARGIN + LOGO_SIZE + 8, PAGE_MARGIN, {
      width: 180,
    });
  doc
    .fillColor(paper.foreground)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(view.number, PAGE_MARGIN + LOGO_SIZE + 8, PAGE_MARGIN + 12, {
      width: 180,
    });
  doc.font("Helvetica");

  const metaX = PAGE_MARGIN + CONTENT_WIDTH - 200;
  const metaRows: [string, string][] = [
    ["Issue date", view.issuedOn || "—"],
    ["Valid until", view.validUntil || "—"],
    ["Place of supply", view.placeOfSupply || "—"],
  ];
  if (view.supplyTypeLabel) {
    metaRows.push(["Supply", view.supplyTypeLabel]);
  }
  metaRows.forEach(([label, value], index) => {
    const y = PAGE_MARGIN + index * 14;
    doc.fontSize(8).fillColor(paper.muted).text(label, metaX, y, { width: 90 });
    doc.fillColor(paper.foreground).text(value, metaX + 90, y, {
      width: 110,
      align: "right",
    });
  });

  const headerBottom = PAGE_MARGIN + Math.max(LOGO_SIZE, metaRows.length * 14) + 12;
  doc
    .strokeColor(paper.border)
    .moveTo(PAGE_MARGIN, headerBottom)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, headerBottom)
    .stroke();

  const colWidth = (CONTENT_WIDTH - 16) / 2;
  const billedY = headerBottom + 14;
  const leftBottom = drawParty(
    doc,
    PAGE_MARGIN,
    billedY,
    colWidth,
    "Quoted by",
    view.seller
  );
  const rightBottom = drawParty(
    doc,
    PAGE_MARGIN + colWidth + 16,
    billedY,
    colWidth,
    "Quoted to",
    view.buyer
  );

  let tableTop = Math.max(leftBottom, rightBottom) + 16;
  const columns = [
    { label: "Item", width: 120, align: "left" as const },
    { label: "HSN", width: 48, align: "left" as const },
    { label: "Qty", width: 56, align: "right" as const },
    { label: "Rate", width: 58, align: "right" as const },
    { label: "Disc.", width: 50, align: "right" as const },
    { label: "Taxable", width: 58, align: "right" as const },
    { label: "GST", width: 40, align: "right" as const },
    { label: "Amount", width: 85, align: "right" as const },
  ];

  doc.fontSize(7).fillColor(paper.muted);
  let headerX = PAGE_MARGIN;
  for (const column of columns) {
    doc.text(column.label.toUpperCase(), headerX, tableTop, {
      width: column.width,
      align: column.align,
    });
    headerX += column.width;
  }
  tableTop += 14;
  doc
    .strokeColor(paper.border)
    .moveTo(PAGE_MARGIN, tableTop)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, tableTop)
    .stroke();
  tableTop += 6;

  if (view.lines.length === 0) {
    doc
      .fontSize(8)
      .fillColor(paper.muted)
      .text("No line items.", PAGE_MARGIN, tableTop);
    tableTop += 16;
  } else {
    for (const line of view.lines) {
      if (tableTop > 720) {
        doc.addPage();
        tableTop = PAGE_MARGIN;
      }
      const values = [
        line.description,
        line.hsnSac ?? "—",
        line.quantityLabel,
        line.unitPrice,
        line.discount,
        line.taxable ?? "—",
        line.taxRateLabel ?? "—",
        line.amount ?? "—",
      ];
      let x = PAGE_MARGIN;
      let rowHeight = 12;
      columns.forEach((column, index) => {
        doc.fontSize(8).fillColor(paper.foreground);
        const height = doc.heightOfString(values[index] ?? "—", {
          width: column.width,
          align: column.align,
        });
        rowHeight = Math.max(rowHeight, height);
        doc.text(values[index] ?? "—", x, tableTop, {
          width: column.width,
          align: column.align,
          lineBreak: false,
        });
        x += column.width;
      });
      tableTop += rowHeight + 6;
    }
  }

  tableTop += 8;
  const summaryTop = tableTop;
  const totalsX = PAGE_MARGIN + CONTENT_WIDTH - 200;
  const totals = [
    ["Taxable", view.totals?.taxable ?? "—"],
    ["CGST", view.totals?.cgst ?? "—"],
    ["SGST", view.totals?.sgst ?? "—"],
    ["IGST", view.totals?.igst ?? "—"],
  ] as const;

  let totalsBottom = summaryTop;
  for (const [label, value] of totals) {
    doc.font("Helvetica").fontSize(8);
    doc.fillColor(paper.muted).text(label, totalsX, totalsBottom, { width: 70 });
    doc.fillColor(paper.foreground).text(value, totalsX + 70, totalsBottom, {
      width: 130,
      align: "right",
    });
    totalsBottom += 12;
  }

  doc
    .strokeColor(paper.border)
    .moveTo(totalsX, totalsBottom + 2)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, totalsBottom + 2)
    .stroke();
  totalsBottom += 8;
  doc.font("Helvetica-Bold").fontSize(10);
  doc.fillColor(paper.foreground).text("Total", totalsX, totalsBottom, {
    width: 70,
  });
  doc.text(view.totals?.grandTotal ?? "—", totalsX + 70, totalsBottom, {
    width: 130,
    align: "right",
  });
  totalsBottom += 16;
  doc.font("Helvetica");

  let notesBottom = summaryTop;
  if (view.notes) {
    doc
      .fontSize(8)
      .fillColor(paper.muted)
      .text("NOTES", PAGE_MARGIN, summaryTop, { width: CONTENT_WIDTH - 220 });
    doc
      .fontSize(8)
      .fillColor(paper.foreground)
      .text(view.notes, PAGE_MARGIN, summaryTop + 12, {
        width: CONTENT_WIDTH - 220,
      });
    notesBottom = doc.y;
  }
  const wordsTop = Math.max(notesBottom, totalsBottom) + 10;
  if (view.totals?.amountInWords) {
    doc
      .fontSize(8)
      .fillColor(paper.mutedBody)
      .text(view.totals.amountInWords, PAGE_MARGIN, wordsTop, {
        width: CONTENT_WIDTH,
      });
  }

  doc
    .fontSize(7)
    .fillColor(paper.muted)
    .text("Computer-generated quotation.", PAGE_MARGIN, 780, {
      width: CONTENT_WIDTH,
      lineBreak: false,
    });

  doc.end();
  return finished;
}
