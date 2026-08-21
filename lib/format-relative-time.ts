/**
 * Compact relative time for inbox rows.
 * Buckets: Just now → Nm → Nh → Nd → short date after 7 days.
 */
export function formatRelativeTime(
  iso: string,
  now: Date = new Date()
): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) {
    return "";
  }

  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) {
    return "Just now";
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  return then.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: then.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
