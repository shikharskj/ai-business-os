import { describe, expect, it } from "vitest";

import {
  businessDate,
  financialYearForDate,
} from "@/modules/shared-kernel/dates";

describe("businessDate", () => {
  it("accepts valid YYYY-MM-DD", () => {
    expect(businessDate("2026-04-01")).toBe("2026-04-01");
  });

  it("rejects invalid format", () => {
    expect(() => businessDate("04/01/2026")).toThrow("Invalid business date");
  });
});

describe("financialYearForDate", () => {
  it("Indian FY (April start) for a date in August", () => {
    const fy = financialYearForDate(businessDate("2026-08-19"), 4);
    expect(fy.start).toBe("2026-04-01");
    expect(fy.end).toBe("2027-03-31");
  });

  it("Indian FY for a date in February", () => {
    const fy = financialYearForDate(businessDate("2027-02-15"), 4);
    expect(fy.start).toBe("2026-04-01");
    expect(fy.end).toBe("2027-03-31");
  });

  it("Calendar year (January start)", () => {
    const fy = financialYearForDate(businessDate("2026-06-15"), 1);
    expect(fy.start).toBe("2026-01-01");
    expect(fy.end).toBe("2026-12-31");
  });
});
