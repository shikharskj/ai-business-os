/**
 * Money is represented as integer minor units (paisa for INR).
 * 1 rupee = 100 paisa. ₹125.50 → 12550 minor units.
 * All arithmetic stays in integers — no IEEE float contamination.
 */

export type Money = {
  /** Amount in minor units (paisa). Always an integer. */
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly scale: number;
};

export function money(amountMinor: bigint | number, currency = "INR", scale = 2): Money {
  const minor = typeof amountMinor === "number" ? BigInt(Math.round(amountMinor)) : amountMinor;
  return Object.freeze({ amountMinor: minor, currency, scale });
}

export function moneyFromMajor(major: string, currency = "INR", scale = 2): Money {
  const parts = major.replace(/,/g, "").split(".");
  const intPart = parts[0] ?? "0";
  let fracPart = parts[1] ?? "";

  if (fracPart.length > scale) {
    const roundDigit = Number(fracPart[scale]);
    fracPart = fracPart.slice(0, scale);
    if (roundDigit >= 5) {
      const rounded = BigInt(intPart + fracPart) + 1n;
      return Object.freeze({ amountMinor: rounded, currency, scale });
    }
  } else {
    fracPart = fracPart.padEnd(scale, "0");
  }

  const negative = intPart.startsWith("-");
  const absInt = negative ? intPart.slice(1) : intPart;
  const combined = BigInt(absInt + fracPart);
  return Object.freeze({
    amountMinor: negative ? -combined : combined,
    currency,
    scale,
  });
}

export function moneyFromDecimalString(value: string, currency = "INR", scale = 2): Money {
  return moneyFromMajor(value, currency, scale);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency, a.scale);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency, a.scale);
}

export function multiplyMoney(m: Money, factor: bigint | number): Money {
  if (typeof factor === "number") {
    const scaled = m.amountMinor * BigInt(Math.round(factor * 1_000_000)) / 1_000_000n;
    return money(scaled, m.currency, m.scale);
  }
  return money(m.amountMinor * factor, m.currency, m.scale);
}

export function negateMoney(m: Money): Money {
  return money(-m.amountMinor, m.currency, m.scale);
}

export function isZero(m: Money): boolean {
  return m.amountMinor === 0n;
}

export function isPositive(m: Money): boolean {
  return m.amountMinor > 0n;
}

export function isNegative(m: Money): boolean {
  return m.amountMinor < 0n;
}

export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

export function toMajorString(m: Money): string {
  const abs = m.amountMinor < 0n ? -m.amountMinor : m.amountMinor;
  const str = abs.toString().padStart(m.scale + 1, "0");
  const intPart = str.slice(0, str.length - m.scale) || "0";
  const fracPart = str.slice(str.length - m.scale);
  const sign = m.amountMinor < 0n ? "-" : "";
  return `${sign}${intPart}.${fracPart}`;
}

export function toDecimalForPrisma(m: Money): string {
  return toMajorString(m);
}

export function moneyFromPrismaDecimal(
  value: { toString(): string } | string,
  currency = "INR",
  scale = 2
): Money {
  return moneyFromDecimalString(value.toString(), currency, scale);
}
