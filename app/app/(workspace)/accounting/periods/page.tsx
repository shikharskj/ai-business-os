import { ClosePeriodForm } from "@/components/business/close-period-form";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { getPeriodStatus } from "@/modules/accounting";
import { todayInTimezone } from "@/modules/shared-kernel/dates";

export default async function PeriodsPage() {
  const tenant = await authorize("report:read");
  const canPost = roleHasPermission(tenant.membership.role, "accounting:post");
  const period = getPeriodStatus({
    today: todayInTimezone(tenant.business.timezone),
    closedThroughPeriodKey: tenant.business.closedThroughPeriodKey,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
      <PageHeader
        title="Accounting periods"
        description="View the current period and close periods to block unauthorized posts."
      />

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-base">
          <p>
            <span className="text-muted-foreground">Current period </span>
            <span className="font-mono font-medium">{period.currentPeriodKey}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Closed through </span>
            <span className="font-mono font-medium">
              {period.closedThroughPeriodKey ?? "—"}
            </span>
          </p>
          <p className="text-muted-foreground">
            {period.currentPeriodClosed
              ? "Current period is closed."
              : "Current period is open."}
          </p>
        </CardContent>
      </Card>

      {canPost && !period.currentPeriodClosed ? (
        <Card>
          <CardHeader>
            <CardTitle>Close period</CardTitle>
          </CardHeader>
          <CardContent>
            <ClosePeriodForm defaultPeriodKey={period.currentPeriodKey} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
