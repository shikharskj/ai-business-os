import { formatQuantity } from "@/modules/inventory/domain/quantity";
import type {
  PreparedInvoice,
  PreparedInvoiceLine,
  SalesInvoice,
  SalesInvoiceLine,
} from "@/modules/sales/domain/types";
import { amountInIndianWords } from "@/modules/shared-kernel/amount-in-words";
import { formatIndianNumber } from "@/modules/shared-kernel/format-money";
import type { Money } from "@/modules/shared-kernel/money";
import { toMajorString } from "@/modules/shared-kernel/money";
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import type { GstSupplyType } from "@/modules/tax/domain/types";
import type { BusinessProfile } from "@/modules/tenant/domain/types";

export type InvoiceDocumentPartyView = {
  name: string;
  addressLines: string[];
  gstin: string | null;
  phone: string | null;
  email: string | null;
};

export type InvoiceDocumentLineView = {
  description: string;
  hsnSac: string | null;
  quantityLabel: string;
  unitPrice: string;
  discount: string;
  taxable: string | null;
  taxRateLabel: string | null;
  cgst: string | null;
  sgst: string | null;
  igst: string | null;
  amount: string | null;
};

export type InvoiceDocumentTotalsView = {
  taxable: string;
  cgst: string;
  sgst: string;
  igst: string;
  grandTotal: string;
  amountInWords: string;
};

export type InvoiceDocumentView = {
  title: "TAX INVOICE";
  number: string;
  issuedOn: string;
  dueOn: string | null;
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

export type InvoiceDocumentBuyerInput = {
  name: string;
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type InvoiceDocumentDraftLine = {
  description: string;
  hsnSac: string | null;
  quantityLabel: string;
  unitPrice: string;
  discount: string;
};

export function businessLettermark(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "B";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function sellerPartyFromBusiness(
  business: BusinessProfile
): InvoiceDocumentPartyView {
  return {
    name: business.name,
    addressLines: compactAddress([
      business.addressLine1,
      business.addressLine2,
      [business.city, business.state, business.postalCode]
        .filter(Boolean)
        .join(", "),
      business.country,
    ]),
    gstin: business.gstin,
    phone: business.phone,
    email: business.email,
  };
}

export function buyerPartyFromCustomer(
  customer: InvoiceDocumentBuyerInput | null | undefined
): InvoiceDocumentPartyView {
  if (!customer) {
    return {
      name: "Select a customer",
      addressLines: [],
      gstin: null,
      phone: null,
      email: null,
    };
  }

  return {
    name: customer.name,
    addressLines: compactAddress([
      customer.billingAddressLine1,
      customer.billingAddressLine2,
      [customer.city, customer.state, customer.postalCode]
        .filter(Boolean)
        .join(", "),
      customer.country && customer.country !== "IN" ? customer.country : null,
    ]),
    gstin: customer.gstin ?? null,
    phone: customer.phone ?? null,
    email: customer.email ?? null,
  };
}

function compactAddress(lines: Array<string | null | undefined>): string[] {
  return lines
    .map((line) => line?.trim() ?? "")
    .filter((line) => line.length > 0);
}

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
  line: PreparedInvoiceLine | SalesInvoiceLine
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

function mapDraftLine(line: InvoiceDocumentDraftLine): InvoiceDocumentLineView {
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

export function buildInvoiceDocumentView(input: {
  number: string;
  issuedOn: string;
  dueOn: string | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  seller: BusinessProfile;
  buyer: InvoiceDocumentBuyerInput | null;
  logoUrl: string | null;
  prepared?: PreparedInvoice | SalesInvoice | null;
  draftLines?: InvoiceDocumentDraftLine[];
  totalsPendingMessage?: string | null;
}): InvoiceDocumentView {
  const prepared = input.prepared ?? null;
  const placeOfSupply =
    GST_STATE_CODES[input.placeOfSupplyStateCode] ??
    input.placeOfSupplyStateCode ??
    "—";

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
    title: "TAX INVOICE",
    number: input.number,
    issuedOn: input.issuedOn,
    dueOn: input.dueOn,
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

export function quantityLabelFromDraft(input: {
  quantity: string;
  unitOfMeasurement: string;
}): string {
  const qty = input.quantity.trim() || "0";
  return `${qty} ${input.unitOfMeasurement}`.trim();
}
