const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const monthIndex = Number(month) - 1;
  const monthLabel = MONTHS[monthIndex];
  if (!year || !monthLabel || !day) {
    return iso;
  }
  return `${Number(day)} ${monthLabel} ${year}`;
}

export function movementCauseLabel(cause: string): string {
  switch (cause) {
    case "OPENING":
      return "Opening stock";
    case "ADJUSTMENT":
      return "Adjustment";
    case "SALE":
      return "Sale";
    case "PURCHASE":
      return "Purchase";
    case "RETURN":
      return "Return";
    default:
      return cause;
  }
}
