import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge, type BadgeTone } from "@/components/business/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import {
  getWorkflowRun,
  toWorkflowRunView,
  workflowRunHref,
} from "@/modules/workflows";
import { prismaWorkflowRunRepository } from "@/modules/workflows/infrastructure/prisma-workflow-run-repository";
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

function canViewRelatedRecord(
  role: Parameters<typeof roleHasPermission>[0],
  aggregateType: string
): boolean {
  switch (aggregateType) {
    case "SalesInvoice":
      return roleHasPermission(role, "invoice:read");
    case "Quotation":
      return roleHasPermission(role, "quotation:read");
    case "Product":
      return roleHasPermission(role, "product:read");
    case "Expense":
      return roleHasPermission(role, "expense:read");
    default:
      return false;
  }
}

export default async function AutomationRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("settings:read");
  const { id } = await params;
  const run = await getWorkflowRun({
    tenantId: tenant.tenantId,
    runId: id,
    runs: prismaWorkflowRunRepository,
  });

  if (!run) {
    notFound();
  }

  const view = toWorkflowRunView(run);
  const relatedHref = workflowRunHref(view.aggregateType, view.aggregateId);
  const showRelatedLink =
    relatedHref &&
    canViewRelatedRecord(tenant.membership.role, view.aggregateType);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <PageHeader
        title={view.label}
        description="Automation run detail"
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/settings" />}
          >
            Back to settings
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle>Run status</CardTitle>
          <StatusBadge tone={STATUS_TONE[view.status]} size="sm">
            {STATUS_LABEL[view.status]}
          </StatusBadge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-base">
          <dl className="grid gap-3">
            <div>
              <dt className="text-sm text-muted-foreground">Started</dt>
              <dd>{formatRelativeTime(view.createdAt)}</dd>
            </div>
            {view.completedAt ? (
              <div>
                <dt className="text-sm text-muted-foreground">Completed</dt>
                <dd>{formatRelativeTime(view.completedAt)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-sm text-muted-foreground">Trigger</dt>
              <dd>{view.triggerEventType}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Attempts</dt>
              <dd>{view.attemptCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Current step</dt>
              <dd>{view.currentStep}</dd>
            </div>
          </dl>

          {view.resultMessage ? (
            <p className="text-muted-foreground">{view.resultMessage}</p>
          ) : null}

          {view.lastError ? (
            <p className="text-destructive">{view.lastError}</p>
          ) : null}

          {showRelatedLink ? (
            <Link href={relatedHref} className="font-medium hover:underline">
              View related record
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
