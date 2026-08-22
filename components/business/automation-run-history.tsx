import Link from "next/link";

import { StatusBadge, type BadgeTone } from "@/components/business/status-badge";
import { formatRelativeTime } from "@/lib/format-relative-time";
import type { WorkflowRunView } from "@/modules/workflows/schemas/workflow-run.schema";

const STATUS_LABEL: Record<WorkflowRunView["status"], string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  RETRY: "Retrying",
  SUCCEEDED: "Completed",
  SKIPPED: "Skipped",
  DEAD_LETTER: "Failed",
};

const STATUS_TONE: Record<WorkflowRunView["status"], BadgeTone> = {
  PENDING: "neutral",
  RUNNING: "info",
  RETRY: "warning",
  SUCCEEDED: "success",
  SKIPPED: "neutral",
  DEAD_LETTER: "danger",
};

export function AutomationRunHistory({ runs }: { runs: WorkflowRunView[] }) {
  if (runs.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        No automations have run yet. Collection reminders, idle quotation
        follow-ups, reorder prepares, and unusual expense alerts will show up
        here after the next scan.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {runs.map((run) => (
        <li key={run.id} className="py-3 first:pt-0 last:pb-0">
          <Link
            href={`/app/settings/automations/${run.id}`}
            className="flex items-start justify-between gap-4 rounded-md transition-colors hover:bg-muted/30"
          >
            <div className="flex min-w-0 flex-col gap-1 px-1 py-1">
              <p className="text-base font-medium text-foreground">{run.label}</p>
              {run.lastError ? (
                <p className="text-sm text-muted-foreground">{run.lastError}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {formatRelativeTime(run.completedAt ?? run.createdAt)}
                </p>
              )}
            </div>
            <StatusBadge tone={STATUS_TONE[run.status]} size="sm">
              {STATUS_LABEL[run.status]}
            </StatusBadge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
