import type { Money } from "@/modules/shared-kernel/money";
import { formatINR } from "@/modules/shared-kernel/format-money";
import { isNegative } from "@/modules/shared-kernel/money";
import { cn } from "@/lib/utils";

export function MoneyDisplay({
  value,
  className,
}: {
  value: Money;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        isNegative(value) && "text-destructive",
        className
      )}
    >
      {formatINR(value)}
    </span>
  );
}
