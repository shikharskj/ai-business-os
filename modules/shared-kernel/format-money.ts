import type { Money } from "@/modules/shared-kernel/money";
import { toMajorString } from "@/modules/shared-kernel/money";

/**
 * Formats minor units into Indian grouping: ₹1,25,000.00
 * Uses the en-IN locale which provides the correct lakh/crore grouping.
 */
export function formatINR(m: Money): string {
  const major = toMajorString(m);
  const num = Number(major);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: m.scale,
    maximumFractionDigits: m.scale,
  }).format(num);
}

/**
 * Format a raw number string with Indian grouping (no currency symbol).
 */
export function formatIndianNumber(value: string | number, decimals = 2): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
