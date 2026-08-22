import { describe, expect, it } from "vitest";

import { lookupPincode } from "@/lib/geo/lookup-pincode";

describe("lookupPincode", () => {
  it("returns none for invalid input", () => {
    expect(lookupPincode("")).toEqual({ kind: "none" });
    expect(lookupPincode("12345")).toEqual({ kind: "none" });
    expect(lookupPincode("abcdef")).toEqual({ kind: "none" });
    expect(lookupPincode("999999")).toEqual({ kind: "none" });
  });

  it("returns unique for a single-district PIN", () => {
    expect(lookupPincode("411001")).toEqual({
      kind: "unique",
      state: "Maharashtra",
      city: "Pune",
    });
    expect(lookupPincode("560001")).toEqual({
      kind: "unique",
      state: "Karnataka",
      city: "Bengaluru",
    });
  });

  it("returns suggest when multiple districts exist", () => {
    const result = lookupPincode("110092");
    expect(result.kind).toBe("suggest");
    if (result.kind === "suggest") {
      expect(result.state).toBe("Delhi");
      expect(result.cityOptions.length).toBeGreaterThan(1);
    }
  });
});
