import { describe, expect, it } from "vitest";

import {
  addBusinessDays,
  businessDate,
  financialYearForDate,
  hourInTimezone,
  todayInTimezone,
} from "@/modules/shared-kernel/dates";

describe("businessDate", () => {
  it("accepts valid YYYY-MM-DD", () => {
    expect(businessDate("2026-04-01")).toBe("2026-04-01");
  });

  it("rejects invalid format", () => {
    expect(() => businessDate("04/01/2026")).toThrow("Invalid business date");
  });

  it("rejects impossible calendar dates", () => {
    expect(() => businessDate("2026-02-30")).toThrow("Invalid business date");
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

  it("accepts start month boundaries 1 and 12", () => {
    expect(financialYearForDate(businessDate("2026-12-15"), 12).start).toBe(
      "2026-12-01"
    );
    expect(financialYearForDate(businessDate("2026-01-15"), 1).end).toBe(
      "2026-12-31"
    );
  });

  it("rejects invalid start months", () => {
    const date = businessDate("2026-08-19");
    expect(() => financialYearForDate(date, 0)).toThrow("Invalid start month");
    expect(() => financialYearForDate(date, 13)).toThrow("Invalid start month");
    expect(() => financialYearForDate(date, 4.5)).toThrow("Invalid start month");
    expect(() => financialYearForDate(date, Number.NaN)).toThrow(
      "Invalid start month"
    );
  });
});

describe("todayInTimezone", () => {
  it("returns a branded calendar date for Asia/Kolkata", () => {
    const today = todayInTimezone("Asia/Kolkata");
    expect(today).toBe(businessDate(today));
  });
});

describe("addBusinessDays", () => {
  it("steps across month boundaries", () => {
    expect(addBusinessDays(businessDate("2026-03-01"), -1)).toBe("2026-02-28");
    expect(addBusinessDays(businessDate("2026-12-31"), 1)).toBe("2027-01-01");
  });
});

describe("hourInTimezone", () => {
  it("returns the clock hour in the tenant timezone", () => {
    const noonUtc = new Date("2026-08-21T06:30:00.000Z");
    expect(hourInTimezone("Asia/Kolkata", noonUtc)).toBe(12);
  });
});
