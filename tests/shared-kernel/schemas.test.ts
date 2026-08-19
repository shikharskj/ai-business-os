import { describe, expect, it } from "vitest";

import { businessDateSchema, moneyInputSchema } from "@/modules/shared-kernel/schemas";

describe("moneyInputSchema", () => {
  it("strips Indian grouping commas before validating", () => {
    expect(moneyInputSchema.parse("1,25,000.00")).toBe("125000.00");
  });

  it("rejects malformed amounts", () => {
    expect(() => moneyInputSchema.parse("12.345")).toThrow();
  });
});

describe("businessDateSchema", () => {
  it("accepts a real calendar date", () => {
    expect(businessDateSchema.parse("2026-08-19")).toBe("2026-08-19");
  });

  it("rejects February 30", () => {
    expect(() => businessDateSchema.parse("2026-02-30")).toThrow();
  });
});
