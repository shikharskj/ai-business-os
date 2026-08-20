import { Badge } from "@/components/ui/badge";
import type { QuotationStatus } from "@/modules/sales/domain/types";

const LABELS: Record<QuotationStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  CANCELLED: "Cancelled",
  CONVERTED: "Converted",
};

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const variant =
    status === "ACCEPTED" || status === "CONVERTED"
      ? "secondary"
      : status === "CANCELLED"
        ? "destructive"
        : status === "SENT"
          ? "outline"
          : "outline";

  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}
