import Link from "next/link";

import { MoneyDisplay } from "@/components/business/money-display";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authorize } from "@/lib/security";
import {
  getTrialBalance,
  periodKeyFromDate,
  trialBalanceSearchSchema,
} from "@/modules/accounting";
import {
  prismaAccountRepository,
  prismaJournalRepository,
} from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { todayInTimezone } from "@/modules/shared-kernel/dates";

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const tenant = await authorize("report:read");
  const params = await searchParams;
  const currentPeriod = periodKeyFromDate(todayInTimezone(tenant.business.timezone));

  const periodValue = Array.isArray(params.period) ? params.period[0] : params.period;
  const parseResult = periodValue ? trialBalanceSearchSchema.shape.period.safeParse(periodValue) : { success: true, data: currentPeriod };

  const period = parseResult.success ? parseResult.data : currentPeriod;
  const validationError = !parseResult.success ? "Invalid period format (expected YYYY-MM)" : null;

  const trialBalance = await getTrialBalance({
    tenantId: tenant.tenantId,
    periodKey: period,
    accounts: prismaAccountRepository,
    journals: prismaJournalRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title="Trial balance report"
        description="Period totals from posted journals (same getTrialBalance query as Accounting)."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/reports" />}
          >
            Back
          </Button>
        }
      />

      {validationError ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-base text-destructive">
          {validationError}
        </div>
      ) : null}

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="period" className="text-base font-medium">
            Period
          </label>
          <Input id="period" name="period" defaultValue={period} placeholder="YYYY-MM" />
        </div>
        <Button type="submit" variant="outline">
          Show
        </Button>
      </form>

      <p className="text-base">
        Period <span className="font-mono font-medium">{trialBalance.periodKey}</span>
        {" · "}
        {trialBalance.isBalanced ? "Balanced" : "Unbalanced"}
      </p>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trialBalance.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No posted activity in this period.
                </TableCell>
              </TableRow>
            ) : (
              trialBalance.rows.map((row) => (
                <TableRow key={row.accountId}>
                  <TableCell className="font-mono text-sm">{row.accountCode}</TableCell>
                  <TableCell>
                    <Link
                      href={`/app/reports/ledger?accountId=${row.accountId}&period=${period}`}
                      className="hover:underline"
                    >
                      {row.accountName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={row.debitTotal} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={row.creditTotal} />
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow>
              <TableCell colSpan={2} className="font-medium">
                Total
              </TableCell>
              <TableCell className="text-right font-medium">
                <MoneyDisplay value={trialBalance.totalDebits} />
              </TableCell>
              <TableCell className="text-right font-medium">
                <MoneyDisplay value={trialBalance.totalCredits} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
