/**
 * Business dates (invoice date, accounting date) are calendar dates
 * without time, stored as ISO 8601 strings (YYYY-MM-DD).
 * Timestamps are always UTC.
 */

export type BusinessDate = string & { readonly __brand: "BusinessDate" };

export function businessDate(iso: string): BusinessDate {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  if (!match) {
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
  return formatter.format(new Date()) as BusinessDate;
}

export function utcNow(): Date {
  return new Date();
}

export function financialYearForDate(
  date: BusinessDate,
  startMonth: number
): { start: BusinessDate; end: BusinessDate } {
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
