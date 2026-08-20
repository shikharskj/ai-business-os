import { Badge } from "@/components/ui/badge";

export function StockStatusBadge({
  isLowStock,
  hasMovements,
}: {
  isLowStock: boolean;
  hasMovements: boolean;
}) {
  if (!hasMovements) {
    return <Badge variant="outline">No movements yet</Badge>;
  }

  if (isLowStock) {
    return (
      <Badge className="border-transparent bg-[var(--state-warning-subtle)] text-[var(--state-warning)]">
        Low stock
      </Badge>
    );
  }

  return <Badge variant="secondary">In stock</Badge>;
}
