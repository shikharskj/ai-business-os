import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AuditRecordView } from "@/modules/shared-kernel/audit";

const ACTION_LABELS: Record<string, string> = {
  "invoice.created": "Invoice created",
  "invoice.updated": "Invoice updated",
  "invoice.posted": "Invoice posted",
  "invoice.cancelled": "Invoice cancelled",
  "quotation.created": "Quotation created",
  "quotation.updated": "Quotation updated",
  "quotation.sent": "Quotation sent",
  "quotation.accepted": "Quotation accepted",
  "quotation.cancelled": "Quotation cancelled",
  "quotation.converted": "Quotation converted to invoice",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function EntityActivityPanel({
  records,
  timezone,
  emptyMessage = "No activity recorded yet.",
  className,
}: {
  records: AuditRecordView[];
  timezone: string;
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-base text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ol className="relative m-0 list-none p-0">
            {records.map((record, index) => {
              const isLast = index === records.length - 1;
              return (
                <li
                  key={record.id}
                  className={cn(
                    "relative grid grid-cols-[1rem_minmax(0,1fr)] gap-x-3",
                    !isLast && "pb-5"
                  )}
                >
                  <div className="relative flex justify-center" aria-hidden>
                    {!isLast ? (
                      <span className="absolute top-3 -bottom-5 w-px bg-border" />
                    ) : null}
                    <span className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full bg-foreground ring-4 ring-background" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-0.5 pt-0.5">
                    <p className="text-base font-medium leading-snug">
                      {auditActionLabel(record.action)}
                    </p>
                    <time
                      className="text-sm text-muted-foreground"
                      dateTime={record.createdAt.toISOString()}
                    >
                      {record.createdAt.toLocaleString("en-IN", {
                        timeZone: timezone,
                      })}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
