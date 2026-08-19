import type { Money } from "@/modules/shared-kernel/money";
import { moneyFromMajor, toMajorString } from "@/modules/shared-kernel/money";

/**
 * Formats minor units into Indian grouping: ₹1,25,000.00
 */
export function formatINR(m: Money): string {
  const major = toMajorString(m);
  const negative = major.startsWith("-");
  const unsigned = negative ? major.slice(1) : major;
  const [intPart = "0", fracPart = ""] = unsigned.split(".");
  const grouped = `${groupIndian(intPart)}.${fracPart}`;
  return `${negative ? "-" : ""}₹${grouped}`;
}

/**
 * Format a raw number string with Indian grouping (no currency symbol).
 * String inputs are formatted exactly. Number inputs that cannot be
 * represented as a safe integer are rejected.
 */
export function formatIndianNumber(value: string | number, decimals = 2): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
      throw new Error("Value cannot be represented safely as a number");
    }
    return formatGroupedMajor(toMajorString(moneyFromMajor(String(value), "INR", decimals)));
  }

  return formatGroupedMajor(toMajorString(moneyFromMajor(value, "INR", decimals)));
}

function formatGroupedMajor(major: string): string {
  const negative = major.startsWith("-");
  const unsigned = negative ? major.slice(1) : major;
  const [intPart = "0", fracPart = ""] = unsigned.split(".");
  const grouped = `${groupIndian(intPart)}.${fracPart}`;
  return `${negative ? "-" : ""}${grouped}`;
}

function groupIndian(intDigits: string): string {
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
