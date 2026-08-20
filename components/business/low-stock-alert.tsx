import { AlertTriangle } from "lucide-react";

export function LowStockAlert({
  count,
}: {
  count: number;
}) {
  if (count <= 0) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex gap-3 rounded-md border border-border bg-[var(--state-warning-subtle)] p-4"
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--state-warning)]" />
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">Low stock</p>
        <p className="text-base text-muted-foreground">
          {count === 1
            ? "1 product is at or below your low-stock quantity."
            : `${count} products are at or below your low-stock quantity.`}
        </p>
      </div>
    </div>
  );
}
