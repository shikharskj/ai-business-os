import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { getPeriodStatus } from "@/modules/accounting";
import { todayInTimezone } from "@/modules/shared-kernel/dates";

const links = [
  {
    href: "/app/accounting/accounts",
    title: "Chart of accounts",
    description: "View the per-tenant chart used by posting.",
  },
  {
    href: "/app/accounting/journals",
    title: "Journals",
    description: "Browse posted journals. Reverse or post adjustments without editing posted lines.",
  },
  {
    href: "/app/accounting/ledger",
    title: "Ledger",
    description: "Account ledger filtered by date or period.",
  },
  {
    href: "/app/accounting/trial-balance",
    title: "Trial balance",
    description: "Period trial balance — total debits must equal total credits.",
  },
  {
    href: "/app/accounting/periods",
    title: "Periods",
    description: "View the current period and close periods to block further posts.",
  },
];

export default async function AccountingOverviewPage() {
  const tenant = await authorize("report:read");
  const canPost = roleHasPermission(tenant.membership.role, "accounting:post");
  const period = getPeriodStatus({
    today: todayInTimezone(tenant.business.timezone),
    closedThroughPeriodKey: tenant.business.closedThroughPeriodKey,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Accounting"
        description="Simple Indian double-entry ledger, trial balance, period close, and reversals."
        actions={
          canPost ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/accounting/journals/new" />}
            >
              Post adjustment
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Current period</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-base">
          <p>
            <span className="text-muted-foreground">Period </span>
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
              ? "The current period is closed. New posts into it are rejected."
              : "The current period is open for posting."}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {links.map((link) => (
          <Card key={link.href}>
            <CardHeader>
              <CardTitle>
                <Link href={link.href} className="hover:underline">
                  {link.title}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-base text-muted-foreground">
              {link.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
