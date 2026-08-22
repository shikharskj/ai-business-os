import { describe, expect, it } from "vitest";

import {
  cityBelongsToState,
  getCitiesForState,
  getStateForCity,
} from "@/lib/geo/indian-cities";

describe("indian-cities", () => {
  it("returns cities for a state", () => {
    expect(getCitiesForState("Maharashtra")).toContain("Pune");
    expect(getCitiesForState("Unknown")).toEqual([]);
  });

  it("maps a unique city to its state", () => {
    expect(getStateForCity("Pune")).toBe("Maharashtra");
    expect(getStateForCity("Bengaluru")).toBe("Karnataka");
  });

  it("checks city belongs to state", () => {
    expect(cityBelongsToState("Pune", "Maharashtra")).toBe(true);
    expect(cityBelongsToState("Pune", "Karnataka")).toBe(false);
    expect(cityBelongsToState("Small Town", "Maharashtra")).toBe(true);
  });
});
