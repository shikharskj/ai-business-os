import { describe, expect, it } from "vitest";

import { money } from "@/modules/shared-kernel/money";
import { amountInIndianWords } from "@/modules/shared-kernel/amount-in-words";

describe("amountInIndianWords", () => {
  it("formats rupees and paise with Indian grouping words", () => {
    expect(amountInIndianWords(money(1_25_000_00n))).toBe(
      "INR One Lakh Twenty Five Thousand Rupees Only"
    );
    expect(amountInIndianWords(money(1_50n))).toBe(
      "INR One Rupee and Fifty Paise Only"
    );
    expect(amountInIndianWords(money(0n))).toBe("INR Zero Rupees Only");
  });
});
