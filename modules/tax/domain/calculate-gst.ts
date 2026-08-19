import { addMoney, money, type Money } from "@/modules/shared-kernel/money";

import { InvalidTaxRateError } from "@/modules/tax/domain/errors";
import {
  gstinStateCode,
  normalizeGstin,
  requireGstStateCode,
} from "@/modules/tax/domain/gstin";
import { splitIntraStateTax, taxMinorFromRateBps } from "@/modules/tax/domain/rounding";
import type {
  GstBreakdown,
  GstCalculationInput,
  GstSupplyType,
  GstTreatment,
} from "@/modules/tax/domain/types";

function zeroLike(amount: Money): Money {
  return money(0n, amount.currency, amount.scale);
}

function withMinor(amount: Money, minor: bigint): Money {
  return money(minor, amount.currency, amount.scale);
}

function validateRateBps(rateBps: number): void {
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000) {
    throw new InvalidTaxRateError(rateBps);
  }
}

function originStateCode(input: GstCalculationInput): string | null {
  if (input.transactionType === "SALE") {
    if (input.businessGstin) {
      return gstinStateCode(input.businessGstin);
    }
    return input.businessStateCode ? requireGstStateCode(input.businessStateCode) : null;
  }

  if (input.counterpartyGstin) {
    return gstinStateCode(input.counterpartyGstin);
  }
  return null;
}

function emptyBreakdown(
  input: GstCalculationInput,
  treatment: GstTreatment
): GstBreakdown {
  const zero = zeroLike(input.taxableAmount);
  return {
    taxableAmount: input.taxableAmount,
    cgst: zero,
    sgst: zero,
    igst: zero,
    totalTax: zero,
    grandTotal: input.taxableAmount,
    supplyType: "NONE",
    treatment,
    taxRateBps: 0,
    hsnSac: input.hsnSac,
  };
}

export function calculateGst(input: GstCalculationInput): GstBreakdown {
  validateRateBps(input.taxRateBps);
  requireGstStateCode(input.placeOfSupplyStateCode);
  if (input.businessGstin) {
    normalizeGstin(input.businessGstin);
  }
  if (input.counterpartyGstin) {
    normalizeGstin(input.counterpartyGstin);
  }

  if (input.businessGstRegistrationStatus === "NOT_REGISTERED") {
    return emptyBreakdown(input, "NOT_REGISTERED");
  }

  if (
    input.businessGstRegistrationStatus === "COMPOSITION" &&
    input.transactionType === "SALE"
  ) {
    return emptyBreakdown(input, "COMPOSITION");
  }

  if (input.transactionType !== "SALE" && !input.counterpartyGstin) {
    return emptyBreakdown(input, "UNREGISTERED_COUNTERPARTY");
  }

  const origin = originStateCode(input);
  if (!origin) {
    return emptyBreakdown(input, "NOT_REGISTERED");
  }

  if (input.taxRateBps === 0) {
    const supplyType: GstSupplyType =
      origin === input.placeOfSupplyStateCode ? "INTRA_STATE" : "INTER_STATE";
    const zero = zeroLike(input.taxableAmount);
    return {
      taxableAmount: input.taxableAmount,
      cgst: zero,
      sgst: zero,
      igst: zero,
      totalTax: zero,
      grandTotal: input.taxableAmount,
      supplyType,
      treatment: "EXEMPT",
      taxRateBps: 0,
      hsnSac: input.hsnSac,
    };
  }

  const totalTaxMinor = taxMinorFromRateBps(
    input.taxableAmount.amountMinor,
    input.taxRateBps
  );
  const totalTax = withMinor(input.taxableAmount, totalTaxMinor);
  const intra = origin === input.placeOfSupplyStateCode;

  if (intra) {
    const split = splitIntraStateTax(totalTaxMinor);
    const cgst = withMinor(input.taxableAmount, split.cgstMinor);
    const sgst = withMinor(input.taxableAmount, split.sgstMinor);
    return {
      taxableAmount: input.taxableAmount,
      cgst,
      sgst,
      igst: zeroLike(input.taxableAmount),
      totalTax,
      grandTotal: addMoney(input.taxableAmount, totalTax),
      supplyType: "INTRA_STATE",
      treatment: "STANDARD",
      taxRateBps: input.taxRateBps,
      hsnSac: input.hsnSac,
    };
  }

  return {
    taxableAmount: input.taxableAmount,
    cgst: zeroLike(input.taxableAmount),
    sgst: zeroLike(input.taxableAmount),
    igst: totalTax,
    totalTax,
    grandTotal: addMoney(input.taxableAmount, totalTax),
    supplyType: "INTER_STATE",
    treatment: "STANDARD",
    taxRateBps: input.taxRateBps,
    hsnSac: input.hsnSac,
  };
}
