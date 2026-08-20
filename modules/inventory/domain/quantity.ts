/**
 * Quantity uses integer minor units at a fixed scale of 4
 * (1 unit = 10_000 minor units). Arithmetic stays in integers —
 * no IEEE float contamination.
 */

export const QUANTITY_SCALE = 4;
export const QUANTITY_SCALE_FACTOR = 10n ** BigInt(QUANTITY_SCALE);

export const DEFAULT_LOW_STOCK_THRESHOLD_MAJOR = "5";

export type Quantity = {
  readonly amountMinor: bigint;
  readonly scale: typeof QUANTITY_SCALE;
};

export function quantity(amountMinor: bigint | number): Quantity {
  const minor =
    typeof amountMinor === "number" ? BigInt(Math.round(amountMinor)) : amountMinor;
  return Object.freeze({ amountMinor: minor, scale: QUANTITY_SCALE });
}

export function quantityFromMajor(major: string): Quantity {
  const parts = major.replace(/,/g, "").split(".");
  const intPart = parts[0] ?? "0";
  let fracPart = parts[1] ?? "";
  const negative = intPart.startsWith("-");
  const absInt = negative ? intPart.slice(1) : intPart;

  if (!/^\d*$/.test(absInt) || !/^\d*$/.test(fracPart)) {
    throw new Error(`Invalid quantity: "${major}".`);
  }

  let roundAwayFromZero = false;
  if (fracPart.length > QUANTITY_SCALE) {
    const roundDigit = Number(fracPart[QUANTITY_SCALE]);
    fracPart = fracPart.slice(0, QUANTITY_SCALE);
    roundAwayFromZero = roundDigit >= 5;
  } else {
    fracPart = fracPart.padEnd(QUANTITY_SCALE, "0");
  }

  let absMinor = BigInt((absInt || "0") + fracPart);
  if (roundAwayFromZero) {
    absMinor += 1n;
  }

  return quantity(negative ? -absMinor : absMinor);
}

export function quantityFromPrismaDecimal(value: { toString(): string } | string): Quantity {
  return quantityFromMajor(value.toString());
}

export function addQuantity(a: Quantity, b: Quantity): Quantity {
  return quantity(a.amountMinor + b.amountMinor);
}

export function subtractQuantity(a: Quantity, b: Quantity): Quantity {
  return quantity(a.amountMinor - b.amountMinor);
}

export function negateQuantity(q: Quantity): Quantity {
  return quantity(-q.amountMinor);
}

export function isZeroQuantity(q: Quantity): boolean {
  return q.amountMinor === 0n;
}

export function isPositiveQuantity(q: Quantity): boolean {
  return q.amountMinor > 0n;
}

export function isNegativeQuantity(q: Quantity): boolean {
  return q.amountMinor < 0n;
}

export function compareQuantity(a: Quantity, b: Quantity): -1 | 0 | 1 {
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

export function toQuantityMajorString(q: Quantity): string {
  const abs = q.amountMinor < 0n ? -q.amountMinor : q.amountMinor;
  const str = abs.toString().padStart(QUANTITY_SCALE + 1, "0");
  const intPart = str.slice(0, str.length - QUANTITY_SCALE) || "0";
  const fracPart = str.slice(str.length - QUANTITY_SCALE);
  const sign = q.amountMinor < 0n ? "-" : "";
  return `${sign}${intPart}.${fracPart}`;
}

export function toQuantityDecimalForPrisma(q: Quantity): string {
  return toQuantityMajorString(q);
}

export function formatQuantity(q: Quantity): string {
  const major = toQuantityMajorString(q);
  const negative = major.startsWith("-");
  const unsigned = negative ? major.slice(1) : major;
  const [intPart = "0", fracPart = ""] = unsigned.split(".");
  const grouped = groupIndianInt(intPart);
  const fracTrimmed = fracPart.replace(/0+$/, "");
  const body = fracTrimmed.length > 0 ? `${grouped}.${fracTrimmed}` : grouped;
  return `${negative ? "-" : ""}${body}`;
}

export const ZERO_QUANTITY = quantity(0n);
export const DEFAULT_LOW_STOCK_THRESHOLD = quantityFromMajor(
  DEFAULT_LOW_STOCK_THRESHOLD_MAJOR
);

function groupIndianInt(intDigits: string): string {
  const digits = intDigits.replace(/^0+(?=\d)/, "") || "0";
  if (digits.length <= 3) {
    return digits;
  }
  const lastThree = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const groups: string[] = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) {
    groups.unshift(rest);
  }
  return `${groups.join(",")},${lastThree}`;
}
