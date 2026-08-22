import { describe, expect, it } from "vitest";

import { mapIndiaPostResponse } from "@/lib/geo/lookup-pincode-api";

describe("mapIndiaPostResponse", () => {
  it("returns unique for one district", () => {
    expect(
      mapIndiaPostResponse("411001", {
        Status: "Success",
        PostOffice: [{ State: "Maharashtra", District: "Pune", Name: "Pune City" }],
      })
    ).toEqual({
      kind: "unique",
      state: "Maharashtra",
      city: "Pune",
    });
  });

  it("returns suggest for multiple districts", () => {
    const result = mapIndiaPostResponse("400001", {
      Status: "Success",
      PostOffice: [
        { State: "Maharashtra", District: "Mumbai", Name: "Fort" },
        { State: "Maharashtra", District: "Mumbai Suburban", Name: "Andheri" },
      ],
    });
    expect(result.kind).toBe("suggest");
    if (result.kind === "suggest") {
      expect(result.state).toBe("Maharashtra");
      expect(result.cityOptions.length).toBeGreaterThan(1);
    }
  });

  it("returns none on failure", () => {
    expect(mapIndiaPostResponse("999999", { Status: "Error" })).toEqual({
      kind: "none",
    });
  });
});
