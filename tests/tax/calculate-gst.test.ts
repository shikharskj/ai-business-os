import { describe, expect, it } from "vitest";

import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";
import { calculateGst } from "@/modules/tax/domain/calculate-gst";
import { InvalidPlaceOfSupplyError, InvalidTaxRateError } from "@/modules/tax/domain/errors";
import { calculateTax } from "@/modules/tax/application/calculate-tax";
import {
  createMemoryHsnSacRepository,
  createMemoryTaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";
import type { GstCalculationInput } from "@/modules/tax/domain/types";

const maharashtraGstin = "27AABCU9603R1ZM";
const karnatakaGstin = "29AABCU9603R1Z1";

function saleInput(
  overrides: Partial<GstCalculationInput> = {}
): GstCalculationInput {
  return {
    businessGstin: maharashtraGstin,
    businessGstRegistrationStatus: "REGISTERED",
    businessStateCode: "27",
    counterpartyGstin: null,
    placeOfSupplyStateCode: "27",
    transactionType: "SALE",
    hsnSac: "9983",
    taxableAmount: money(10_000_00n),
    taxRateBps: 1800,
    ...overrides,
  };
}

describe("calculateGst", () => {
  it("splits intra-state GST into equal CGST and SGST", () => {
    const result = calculateGst(saleInput());
    expect(result.supplyType).toBe("INTRA_STATE");
    expect(result.treatment).toBe("STANDARD");
    expect(toMajorString(result.cgst)).toBe("900.00");
    expect(toMajorString(result.sgst)).toBe("900.00");
    expect(toMajorString(result.igst)).toBe("0.00");
    expect(toMajorString(result.totalTax)).toBe("1800.00");
    expect(toMajorString(result.grandTotal)).toBe("11800.00");
  });

  it("applies IGST for inter-state supply", () => {
    const result = calculateGst(
      saleInput({ placeOfSupplyStateCode: "29", counterpartyGstin: karnatakaGstin })
    );
    expect(result.supplyType).toBe("INTER_STATE");
    expect(toMajorString(result.cgst)).toBe("0.00");
    expect(toMajorString(result.sgst)).toBe("0.00");
    expect(toMajorString(result.igst)).toBe("1800.00");
    expect(toMajorString(result.totalTax)).toBe("1800.00");
  });

  it("assigns an odd paisa remainder to SGST", () => {
    const result = calculateGst(
      saleInput({ taxableAmount: money(5n), taxRateBps: 1800 })
    );
    expect(result.totalTax.amountMinor).toBe(1n);
    expect(result.cgst.amountMinor).toBe(0n);
    expect(result.sgst.amountMinor).toBe(1n);
  });

  it("does not charge GST when the supplier is not registered", () => {
    const result = calculateGst(
      saleInput({
        businessGstin: null,
        businessGstRegistrationStatus: "NOT_REGISTERED",
      })
    );
    expect(result.treatment).toBe("NOT_REGISTERED");
    expect(result.supplyType).toBe("NONE");
    expect(result.totalTax.amountMinor).toBe(0n);
    expect(result.grandTotal.amountMinor).toBe(10_000_00n);
  });

  it("does not charge GST on composition outward supplies", () => {
    const result = calculateGst(
      saleInput({ businessGstRegistrationStatus: "COMPOSITION" })
    );
    expect(result.treatment).toBe("COMPOSITION");
    expect(result.totalTax.amountMinor).toBe(0n);
  });

  it("does not invent GST for purchases from unregistered counterparties", () => {
    const result = calculateGst(
      saleInput({
        transactionType: "PURCHASE",
        counterpartyGstin: null,
      })
    );
    expect(result.treatment).toBe("UNREGISTERED_COUNTERPARTY");
    expect(result.totalTax.amountMinor).toBe(0n);
  });

  it("uses integer debit-style rounding rather than IEEE floats", () => {
    const result = calculateGst(
      saleInput({ taxableAmount: money(10n), taxRateBps: 1800 })
    );
    expect(result.totalTax.amountMinor).toBe(2n);
    expect(typeof result.totalTax.amountMinor).toBe("bigint");
  });

  it("rejects invalid rates and place of supply", () => {
    expect(() => calculateGst(saleInput({ taxRateBps: 18.5 }))).toThrow(
      InvalidTaxRateError
    );
    expect(() =>
      calculateGst(saleInput({ placeOfSupplyStateCode: "99" }))
    ).toThrow(InvalidPlaceOfSupplyError);
  });
});

describe("calculateTax", () => {
  it("resolves the rate from an effective-dated HSN/SAC reference", async () => {
    const taxRateRepository = createMemoryTaxRateRepository();
    const hsnSacRepository = createMemoryHsnSacRepository();
    await hsnSacRepository.upsert({
      tenantId: "t1",
      code: "9983",
      description: "IT design",
      kind: "SAC",
      taxRateBps: 1800,
      effectiveFrom: businessDate("2024-04-01"),
      effectiveTo: businessDate("2025-03-31"),
    });
    await hsnSacRepository.upsert({
      tenantId: "t1",
      code: "9983",
      description: "IT design",
      kind: "SAC",
      taxRateBps: 1200,
      effectiveFrom: businessDate("2025-04-01"),
      effectiveTo: null,
    });

    const result = await calculateTax({
      tenantId: "t1",
      businessGstin: maharashtraGstin,
      businessGstRegistrationStatus: "REGISTERED",
      businessStateName: "Maharashtra",
      counterpartyGstin: null,
      placeOfSupplyStateCode: "27",
      transactionType: "SALE",
      hsnSac: "9983",
      taxableAmount: money(10_000_00n),
      defaultGstRateBps: 2800,
      transactionDate: businessDate("2026-08-19"),
      taxRateRepository,
      hsnSacRepository,
    });

    expect(result.taxRateBps).toBe(1200);
    expect(toMajorString(result.totalTax)).toBe("1200.00");
  });

  it("falls back to the tenant default rate when no HSN match exists", async () => {
    const result = await calculateTax({
      tenantId: "t1",
      businessGstin: maharashtraGstin,
      businessGstRegistrationStatus: "REGISTERED",
      businessStateName: "Maharashtra",
      counterpartyGstin: null,
      placeOfSupplyStateCode: "29",
      transactionType: "SALE",
      taxableAmount: money(1_000_00n),
      defaultGstRateBps: 500,
      transactionDate: businessDate("2026-08-19"),
      taxRateRepository: createMemoryTaxRateRepository(),
      hsnSacRepository: createMemoryHsnSacRepository(),
    });

    expect(result.supplyType).toBe("INTER_STATE");
    expect(result.taxRateBps).toBe(500);
    expect(toMajorString(result.igst)).toBe("50.00");
  });
});
