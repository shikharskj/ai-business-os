const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigitWords(value: number): string {
  if (value < 20) {
    return ONES[value] ?? "";
  }
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return [TENS[tens], ONES[ones]].filter(Boolean).join(" ");
}

function threeDigitWords(value: number): string {
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];
  if (hundred > 0) {
    parts.push(`${ONES[hundred]} Hundred`);
  }
  if (rest > 0) {
    parts.push(twoDigitWords(rest));
  }
  return parts.join(" ");
}

function rupeeWords(rupees: bigint): string {
  if (rupees === 0n) {
    return "Zero";
  }

  const crore = rupees / 1_00_00_000n;
  const lakh = (rupees % 1_00_00_000n) / 1_00_000n;
  const thousand = (rupees % 1_00_000n) / 1_000n;
  const remainder = rupees % 1_000n;

  const parts: string[] = [];
  if (crore > 0n) {
    if (crore >= 1000n) {
      throw new Error("Amount exceeds Indian word range (>= 1000 crore)");
    }
    parts.push(`${threeDigitWords(Number(crore))} Crore`);
  }
  if (lakh > 0n) {
    parts.push(`${twoDigitWords(Number(lakh))} Lakh`);
  }
  if (thousand > 0n) {
    parts.push(`${twoDigitWords(Number(thousand))} Thousand`);
  }
  if (remainder > 0n) {
    parts.push(threeDigitWords(Number(remainder)));
  }
  return parts.join(" ");
}

/**
 * Indian numbering in words for invoice totals.
 * Uses integer rupees and paise from Money minor units — not floats.
 */
export function amountInIndianWords(input: {
  amountMinor: bigint;
  currency: string;
  scale: number;
}): string {
  if (input.currency !== "INR") {
    throw new Error(`amountInIndianWords requires INR currency, got ${input.currency}`);
  }
  if (input.scale !== 2) {
    throw new Error(`amountInIndianWords requires scale 2 (paise), got ${input.scale}`);
  }
  const scaleFactor = 100n;
  const abs = input.amountMinor < 0n ? -input.amountMinor : input.amountMinor;
  const major = abs / scaleFactor;
  if (major >= 1000_00_00_000n) {
    throw new Error("Amount exceeds Indian word range (>= 1000 crore)");
  }
  const fraction = abs % scaleFactor;
  const rupeeLabel = major === 1n ? "Rupee" : "Rupees";
  const paiseLabel = fraction === 1n ? "Paisa" : "Paise";

  let body = `${rupeeWords(major)} ${rupeeLabel}`;
  if (fraction > 0n) {
    body += ` and ${twoDigitWords(Number(fraction))} ${paiseLabel}`;
  }
  const signed = input.amountMinor < 0n ? `Minus ${body}` : body;
  return `INR ${signed} Only`;
}
