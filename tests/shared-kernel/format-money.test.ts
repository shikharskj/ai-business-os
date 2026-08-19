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
});

describe("formatIndianNumber", () => {
  it("formats with Indian grouping", () => {
    expect(formatIndianNumber(125000)).toContain("1,25,000");
  });
});
