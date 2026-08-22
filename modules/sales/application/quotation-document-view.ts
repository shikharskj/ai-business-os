import type {
  PreparedQuotation,
  PreparedQuotationLine,
  Quotation,
  QuotationLine,
} from "@/modules/sales/domain/types";
import { amountInIndianWords } from "@/modules/shared-kernel/amount-in-words";
import { formatIndianNumber } from "@/modules/shared-kernel/format-money";
import type { Money } from "@/modules/shared-kernel/money";
import { toMajorString } from "@/modules/shared-kernel/money";
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import type { GstSupplyType } from "@/modules/tax/domain/types";
import type { BusinessProfile } from "@/modules/tenant/domain/types";
import {
  businessLettermark,
  buyerPartyFromCustomer,
  sellerPartyFromBusiness,
  type InvoiceDocumentBuyerInput,
  type InvoiceDocumentDraftLine,
  type InvoiceDocumentLineView,
  type InvoiceDocumentPartyView,
  type InvoiceDocumentTotalsView,
} from "@/modules/sales/application/invoice-document-view";
import { formatQuantity } from "@/modules/inventory/domain/quantity";

export type QuotationDocumentView = {
  title: "QUOTATION";
  number: string;
  issuedOn: string;
  validUntil: string | null;
  placeOfSupply: string;
  supplyTypeLabel: string | null;
  seller: InvoiceDocumentPartyView;
  buyer: InvoiceDocumentPartyView;
  logoUrl: string | null;
  lettermark: string;
  lines: InvoiceDocumentLineView[];
  totals: InvoiceDocumentTotalsView | null;
  notes: string | null;
  totalsPendingMessage: string | null;
};

export type QuotationDocumentDraftLine = InvoiceDocumentDraftLine;
export type QuotationDocumentBuyerInput = InvoiceDocumentBuyerInput;

function formatMoneyCell(value: Money): string {
  return `${value.currency} ${formatIndianNumber(toMajorString(value), value.scale)}`;
}

function supplyTypeLabel(
  supplyType: GstSupplyType | "MIXED" | null | undefined
): string | null {
  if (!supplyType) {
    return null;
  }
  if (supplyType === "INTRA_STATE") {
    return "Intra-state (CGST + SGST)";
  }
  if (supplyType === "INTER_STATE") {
    return "Inter-state (IGST)";
  }
  if (supplyType === "MIXED") {
    return "Mixed supply";
  }
  return "Not taxable";
}

function mapPreparedLine(
  line: PreparedQuotationLine | QuotationLine
): InvoiceDocumentLineView {
  return {
    description: line.productName,
    hsnSac: line.hsnSac,
    quantityLabel: `${formatQuantity(line.quantity)} ${line.unitOfMeasurement}`,
    unitPrice: formatMoneyCell(line.unitPrice),
    discount: formatMoneyCell(line.discount),
    taxable: formatMoneyCell(line.taxableAmount),
    taxRateLabel: `${(line.taxRateBps / 100).toFixed(2)}%`,
    cgst: formatMoneyCell(line.cgst),
    sgst: formatMoneyCell(line.sgst),
    igst: formatMoneyCell(line.igst),
    amount: formatMoneyCell(line.lineTotal),
  };
}

function mapDraftLine(line: QuotationDocumentDraftLine): InvoiceDocumentLineView {
  return {
    description: line.description,
    hsnSac: line.hsnSac,
    quantityLabel: line.quantityLabel,
    unitPrice: line.unitPrice,
    discount: line.discount,
    taxable: null,
    taxRateLabel: null,
    cgst: null,
    sgst: null,
    igst: null,
    amount: null,
  };
}

export function buildQuotationDocumentView(input: {
  number: string;
  issuedOn: string;
  validUntil: string | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  seller: BusinessProfile;
  buyer: QuotationDocumentBuyerInput | null;
  logoUrl: string | null;
  prepared?: PreparedQuotation | Quotation | null;
  draftLines?: QuotationDocumentDraftLine[];
  totalsPendingMessage?: string | null;
}): QuotationDocumentView {
  const prepared = input.prepared ?? null;
  const placeOfSupply = input.placeOfSupplyStateCode
    ? (GST_STATE_CODES[input.placeOfSupplyStateCode] ?? input.placeOfSupplyStateCode)
    : "—";

  const lines = prepared
    ? prepared.lines.map(mapPreparedLine)
    : (input.draftLines ?? []).map(mapDraftLine);

  const totals: InvoiceDocumentTotalsView | null = prepared
    ? {
        taxable: formatMoneyCell(prepared.taxableAmount),
        cgst: formatMoneyCell(prepared.cgst),
        sgst: formatMoneyCell(prepared.sgst),
        igst: formatMoneyCell(prepared.igst),
        grandTotal: formatMoneyCell(prepared.grandTotal),
        amountInWords: amountInIndianWords(prepared.grandTotal),
      }
    : null;

  return {
    title: "QUOTATION",
    number: input.number,
    issuedOn: input.issuedOn,
    validUntil: input.validUntil,
    placeOfSupply,
    supplyTypeLabel: supplyTypeLabel(prepared?.supplyType),
    seller: sellerPartyFromBusiness(input.seller),
    buyer: buyerPartyFromCustomer(input.buyer),
    logoUrl: input.logoUrl,
    lettermark: businessLettermark(input.seller.name),
    lines,
    totals,
    notes: input.notes,
    totalsPendingMessage: prepared
      ? null
      : (input.totalsPendingMessage ??
        "GST updates after the tax engine can price this draft."),
  };
}

export { businessLettermark, buyerPartyFromCustomer, quantityLabelFromDraft } from "@/modules/sales/application/invoice-document-view";
