import { Badge } from "@/components/ui/badge";
import type { SalesInvoiceStatus } from "@/modules/sales/domain/types";

const LABELS: Record<SalesInvoiceStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export function InvoiceStatusBadge({ status }: { status: SalesInvoiceStatus }) {
  const variant =
    status === "PAID"
      ? "secondary"
      : status === "CANCELLED"
        ? "destructive"
        : status === "DRAFT"
          ? "outline"
          : status === "PARTIALLY_PAID"
            ? "outline"
            : "outline";

  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}
