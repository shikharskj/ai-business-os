import { addMoney, money, type Money } from "@/modules/shared-kernel/money";

/**
 * Sums already-persisted GST money fields. Does not calculate tax from rates.
 */
export type StoredGstAmounts = {
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
};

export function zeroStoredGst(currency = "INR", scale = 2): StoredGstAmounts {
  const z = money(0n, currency, scale);
  return {
    taxableAmount: z,
    cgst: z,
    sgst: z,
    igst: z,
    totalTax: z,
  };
}

export function addStoredGst(
  a: StoredGstAmounts,
  b: StoredGstAmounts
): StoredGstAmounts {
  return {
    taxableAmount: addMoney(a.taxableAmount, b.taxableAmount),
    cgst: addMoney(a.cgst, b.cgst),
    sgst: addMoney(a.sgst, b.sgst),
    igst: addMoney(a.igst, b.igst),
    totalTax: addMoney(a.totalTax, b.totalTax),
  };
}

export function sumStoredGst(
  rows: readonly StoredGstAmounts[],
  currency?: string,
  scale?: number
): StoredGstAmounts {
  if (rows.length === 0) {
    return zeroStoredGst(currency, scale);
  }
  const seedCurrency = currency ?? rows[0]!.taxableAmount.currency;
  const seedScale = scale ?? rows[0]!.taxableAmount.scale;
  return rows.reduce(addStoredGst, zeroStoredGst(seedCurrency, seedScale));
}

/**
 * Integrity check: document header tax fields must equal the sum of stored line tax fields.
 * Does not recalculate GST from rates — only compares persisted amounts.
 */
export function storedHeaderMatchesLines(
  header: StoredGstAmounts,
  lines: readonly StoredGstAmounts[]
): boolean {
  const lineSum = sumStoredGst(lines);
  return (
    header.taxableAmount.amountMinor === lineSum.taxableAmount.amountMinor &&
    header.cgst.amountMinor === lineSum.cgst.amountMinor &&
    header.sgst.amountMinor === lineSum.sgst.amountMinor &&
    header.igst.amountMinor === lineSum.igst.amountMinor &&
    header.totalTax.amountMinor === lineSum.totalTax.amountMinor
  );
}
