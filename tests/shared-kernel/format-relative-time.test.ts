import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "@/lib/format-relative-time";

describe("formatRelativeTime", () => {
  const now = new Date("2026-08-21T12:00:00.000Z");

  it("returns Just now for recent timestamps", () => {
    expect(
      formatRelativeTime(new Date(now.getTime() - 30_000).toISOString(), now)
    ).toBe("Just now");
  });

  it("returns minutes and hours buckets", () => {
    expect(
      formatRelativeTime(new Date(now.getTime() - 5 * 60_000).toISOString(), now)
    ).toBe("5m");
    expect(
      formatRelativeTime(
        new Date(now.getTime() - 2 * 60 * 60_000).toISOString(),
        now
      )
    ).toBe("2h");
  });

  it("returns days then a short date after a week", () => {
    expect(
      formatRelativeTime(
        new Date(now.getTime() - 3 * 24 * 60 * 60_000).toISOString(),
        now
      )
    ).toBe("3d");
    const older = formatRelativeTime(
      new Date(now.getTime() - 10 * 24 * 60 * 60_000).toISOString(),
      now
    );
    expect(older).toMatch(/Aug|11/);
  });

  it("returns empty string for invalid ISO", () => {
    expect(formatRelativeTime("not-a-date", now)).toBe("");
  });
});
