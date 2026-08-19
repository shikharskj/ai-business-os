import { describe, expect, it } from "vitest";

import { money } from "@/modules/shared-kernel/money";
import { formatINR, formatIndianNumber } from "@/modules/shared-kernel/format-money";

describe("formatINR", () => {
  it("formats with Indian grouping", () => {
    const m = money(12500000n); // ₹1,25,000.00
    const result = formatINR(m);
    expect(result).toContain("1,25,000");
    expect(result).toContain("₹");
  });

  it("formats small amounts", () => {
    const m = money(5050n); // ₹50.50
    const result = formatINR(m);
    expect(result).toContain("50.50");
  });

  it("formats lakh amounts", () => {
    const m = money(125000000n); // ₹12,50,000.00
    const result = formatINR(m);
    expect(result).toContain("12,50,000");
  });

  it("formats large bigint amounts without Number conversion", () => {
    const m = money(10_000_000_000_000_000n); // ₹1,00,00,00,00,00,000.00
    const result = formatINR(m);
    expect(result).toContain("10,00,00,00,00,00,000.00");
  });

  it("rejects non-INR currencies", () => {
    const usd = money(10000n, "USD");
    expect(() => formatINR(usd)).toThrow("formatINR requires INR currency, got USD");
  });
});

describe("formatIndianNumber", () => {
  it("formats with Indian grouping", () => {
    expect(formatIndianNumber(125000)).toContain("1,25,000");
  });

  it("formats string inputs without Number conversion", () => {
    expect(formatIndianNumber("12500000.50")).toBe("1,25,00,000.50");
  });

  it("rejects unsafe number inputs", () => {
    expect(() => formatIndianNumber(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      "Value cannot be represented safely as a number"
    );
    expect(() => formatIndianNumber(1.25)).toThrow(
      "Value cannot be represented safely as a number"
    );
  });
});
