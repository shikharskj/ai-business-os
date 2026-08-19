import { describe, expect, it } from "vitest";

import {
  money,
  moneyFromMajor,
  addMoney,
  subtractMoney,
  multiplyMoney,
  toMajorString,
  isZero,
  isPositive,
  isNegative,
  compareMoney,
} from "@/modules/shared-kernel/money";

describe("Money", () => {
  it("creates from minor units", () => {
    const m = money(12550n);
    expect(m.amountMinor).toBe(12550n);
    expect(m.currency).toBe("INR");
  });

  it("creates from major string", () => {
    const m = moneyFromMajor("125.50");
    expect(m.amountMinor).toBe(12550n);
  });

  it("creates from major string with commas", () => {
    const m = moneyFromMajor("1,25,000.00");
    expect(m.amountMinor).toBe(12500000n);
  });

  it("adds two money values without floating-point error", () => {
    const a = moneyFromMajor("0.10");
    const b = moneyFromMajor("0.20");
    const result = addMoney(a, b);
    expect(toMajorString(result)).toBe("0.30");
    expect(result.amountMinor).toBe(30n);
  });

  it("subtracts money", () => {
    const a = moneyFromMajor("100.00");
    const b = moneyFromMajor("33.33");
    const result = subtractMoney(a, b);
    expect(toMajorString(result)).toBe("66.67");
  });

  it("multiplies by integer", () => {
    const m = moneyFromMajor("10.50");
    const result = multiplyMoney(m, 3n);
    expect(toMajorString(result)).toBe("31.50");
  });

  it("rejects currency mismatch", () => {
    const inr = money(100n, "INR");
    const usd = money(100n, "USD");
    expect(() => addMoney(inr, usd)).toThrow("Currency mismatch");
  });

  it("isZero / isPositive / isNegative", () => {
    expect(isZero(money(0n))).toBe(true);
    expect(isPositive(money(100n))).toBe(true);
    expect(isNegative(money(-50n))).toBe(true);
  });

  it("compareMoney", () => {
    expect(compareMoney(money(100n), money(200n))).toBe(-1);
    expect(compareMoney(money(200n), money(200n))).toBe(0);
    expect(compareMoney(money(300n), money(200n))).toBe(1);
  });

  it("toMajorString handles negative values", () => {
    expect(toMajorString(money(-12550n))).toBe("-125.50");
  });

  it("never uses IEEE float for stored result", () => {
    const values = Array.from({ length: 100 }, (_, i) =>
      moneyFromMajor("0.10")
    );
    const sum = values.reduce(addMoney);
    expect(sum.amountMinor).toBe(1000n);
    expect(toMajorString(sum)).toBe("10.00");
  });
});
