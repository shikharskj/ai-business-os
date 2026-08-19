/**
 * Business dates (invoice date, accounting date) are calendar dates
 * without time, stored as ISO 8601 strings (YYYY-MM-DD).
 * Timestamps are always UTC.
 */

export type BusinessDate = string & { readonly __brand: "BusinessDate" };

export function isCalendarDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return false;
  }
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function businessDate(iso: string): BusinessDate {
  if (!isCalendarDate(iso)) {
    throw new Error(`Invalid business date: "${iso}". Expected YYYY-MM-DD.`);
  }
  return iso as BusinessDate;
}

export function todayInTimezone(timezone: string): BusinessDate {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error(`Could not resolve calendar date for timezone "${timezone}".`);
  }
  return businessDate(`${year}-${month}-${day}`);
}

export function utcNow(): Date {
  return new Date();
}

export function financialYearForDate(
  date: BusinessDate,
  startMonth: number
): { start: BusinessDate; end: BusinessDate } {
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    throw new Error(
      `Invalid start month: ${startMonth}. Expected an integer from 1 through 12.`
    );
  }
  const [year, month] = date.split("-").map(Number) as [number, number];
  const fyStartYear = month >= startMonth ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  const start = businessDate(
    `${fyStartYear}-${String(startMonth).padStart(2, "0")}-01`
  );

  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  const endYear = startMonth === 1 ? fyStartYear : fyEndYear;
  const lastDay = new Date(endYear, endMonth, 0).getDate();
  const end = businessDate(
    `${endYear}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  );

  return { start, end };
}
