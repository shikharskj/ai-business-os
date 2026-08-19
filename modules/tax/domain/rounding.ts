/**
 * Debit-style GST rounding
 *
 * Tax is computed in integer minor units (paisa). Never IEEE floats.
 *
 * 1. Convert the GST rate to basis points (18.00% = 1800).
 * 2. totalTaxMinor = round_half_away_from_zero(taxableMinor * rateBps / 10_000).
 *    Tie-breaking (exactly 0.5 paisa) rounds away from zero, which increases
 *    the tax/debit side for positive taxable amounts.
 * 3. Intra-state: CGST = floor(totalTax / 2), SGST = remainder.
 *    Any odd paisa is applied to SGST so CGST + SGST = total tax exactly.
 * 4. Inter-state: IGST = total tax; CGST = SGST = 0.
 */

export function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new Error("Division by zero");
  }
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDen = denominator < 0n ? -denominator : denominator;
  const rounded = (absNum + absDen / 2n) / absDen;
  const negative = numerator < 0n !== denominator < 0n;
  return negative ? -rounded : rounded;
}

export function taxMinorFromRateBps(taxableMinor: bigint, rateBps: number): bigint {
  return roundHalfAwayFromZero(taxableMinor * BigInt(rateBps), 10_000n);
}

export function splitIntraStateTax(totalTaxMinor: bigint): {
  cgstMinor: bigint;
  sgstMinor: bigint;
} {
  const abs = totalTaxMinor < 0n ? -totalTaxMinor : totalTaxMinor;
  const cgstAbs = abs / 2n;
  const sgstAbs = abs - cgstAbs;
  if (totalTaxMinor < 0n) {
    return { cgstMinor: -cgstAbs, sgstMinor: -sgstAbs };
  }
  return { cgstMinor: cgstAbs, sgstMinor: sgstAbs };
}
