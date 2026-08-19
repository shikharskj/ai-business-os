import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Money } from "@/modules/shared-kernel/money";

import { calculateGst } from "@/modules/tax/domain/calculate-gst";
import { InvalidTaxRateError } from "@/modules/tax/domain/errors";
import { stateCodeFromName } from "@/modules/tax/domain/gstin";
import type {
  GstBreakdown,
  GstRegistrationStatus,
  TaxTransactionType,
} from "@/modules/tax/domain/types";
import {
  selectEffectiveHsn,
  selectEffectiveRate,
  type HsnSacRepository,
  type TaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";

export type CalculateTaxInput = {
  tenantId: string;
  businessGstin: string | null;
  businessGstRegistrationStatus: GstRegistrationStatus;
  businessStateName: string;
  counterpartyGstin: string | null;
  placeOfSupplyStateCode: string;
  transactionType: TaxTransactionType;
  hsnSac?: string | null;
  taxableAmount: Money;
  taxRateBps?: number;
  defaultGstRateBps: number;
  transactionDate: BusinessDate;
  taxRateRepository: TaxRateRepository;
  hsnSacRepository: HsnSacRepository;
};

export async function calculateTax(input: CalculateTaxInput): Promise<GstBreakdown> {
  const resolvedRateBps = await resolveTaxRateBps(input);

  return calculateGst({
    businessGstin: input.businessGstin,
    businessGstRegistrationStatus: input.businessGstRegistrationStatus,
    businessStateCode: stateCodeFromName(input.businessStateName),
    counterpartyGstin: input.counterpartyGstin,
    placeOfSupplyStateCode: input.placeOfSupplyStateCode,
    transactionType: input.transactionType,
    hsnSac: input.hsnSac?.trim().toUpperCase() ?? null,
    taxableAmount: input.taxableAmount,
    taxRateBps: resolvedRateBps,
  });
}

async function resolveTaxRateBps(input: CalculateTaxInput): Promise<number> {
  if (input.taxRateBps !== undefined) {
    return input.taxRateBps;
  }

  if (input.hsnSac) {
    const codes = await input.hsnSacRepository.listForTenant(input.tenantId);
    const match = selectEffectiveHsn(codes, input.hsnSac, input.transactionDate);
    if (match) {
      return match.taxRateBps;
    }
  }

  const rates = await input.taxRateRepository.listForTenant(input.tenantId);
  const effective = selectEffectiveRate(rates, input.transactionDate);
  if (effective) {
    return effective.rateBps;
  }

  if (
    !Number.isInteger(input.defaultGstRateBps) ||
    input.defaultGstRateBps < 0 ||
    input.defaultGstRateBps > 10_000
  ) {
    throw new InvalidTaxRateError(input.defaultGstRateBps);
  }

  return input.defaultGstRateBps;
}
