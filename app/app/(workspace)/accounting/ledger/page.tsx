import Link from "next/link";

import { MoneyDisplay } from "@/components/business/money-display";
import { DatePicker } from "@/components/date-picker";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getLedger,
  ledgerSearchSchema,
  listChartOfAccounts,
  periodKeyFromDate,
} from "@/modules/accounting";
import {
  prismaAccountRepository,
  prismaJournalRepository,
} from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { businessDate, todayInTimezone } from "@/modules/shared-kernel/dates";
import { BookOpen } from "lucide-react";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{
    accountId?: string;
    period?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const tenant = await authorize("report:read");
  const params = await searchParams;
  const accounts = await listChartOfAccounts({
    tenantId: tenant.tenantId,
    accounts: prismaAccountRepository,
  });
  const selectedAccountId =
    params.accountId && accounts.some((account) => account.id === params.accountId)
      ? params.accountId
      : (accounts[0]?.id ?? "");

  const periodValue = Array.isArray(params.period) ? params.period[0] : params.period;
  const fromValue = Array.isArray(params.from) ? params.from[0] : params.from;
  const toValue = Array.isArray(params.to) ? params.to[0] : params.to;

  const periodResult = periodValue ? ledgerSearchSchema.shape.period.safeParse(periodValue) : { success: true, data: undefined };
  const fromResult = fromValue ? ledgerSearchSchema.shape.from.safeParse(fromValue) : { success: true, data: undefined };
  const toResult = toValue ? ledgerSearchSchema.shape.to.safeParse(toValue) : { success: true, data: undefined };

  const filters = {
    accountId: selectedAccountId,
    period: periodResult.success ? periodResult.data : undefined,
    from: fromResult.success ? fromResult.data : undefined,
    to: toResult.success ? toResult.data : undefined,
  };

  const validationErrors: string[] = [];
  if (!periodResult.success) validationErrors.push("Invalid period format");
  if (!fromResult.success) validationErrors.push("Invalid from date");
  if (!toResult.success) validationErrors.push("Invalid to date");

  const ledger =
    filters.accountId
      ? await getLedger({
          tenantId: tenant.tenantId,
          accountId: filters.accountId,
          periodKey: filters.period,
          fromDate: filters.from ? businessDate(filters.from) : undefined,
          toDate: filters.to ? businessDate(filters.to) : undefined,
          accounts: prismaAccountRepository,
          journals: prismaJournalRepository,
        })
      : null;

  const accountItems = Object.fromEntries(
    accounts.map((account) => [account.id, `${account.code} · ${account.name}`])
  );
  const currentPeriod = periodKeyFromDate(todayInTimezone(tenant.business.timezone));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Ledger"
        description="Account activity from posted journals. Balances are derived from journal lines."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/accounting" />}
          >
            Back
          </Button>
        }
      />

      {validationErrors.length > 0 ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-base text-destructive">
          {validationErrors.join(", ")}
        </div>
      ) : null}

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-64 flex-1 flex-col gap-2">
          <label htmlFor="accountId" className="text-base font-medium">
            Account
          </label>
          <Select
            name="accountId"
            defaultValue={filters.accountId}
            items={accountItems}
          >
            <SelectTrigger id="accountId" className="w-full">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.code} · {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-40 flex-col gap-2">
          <label htmlFor="period" className="text-base font-medium">
            Period
          </label>
          <Input
            id="period"
            name="period"
            defaultValue={filters.period ?? ""}
            placeholder={currentPeriod}
          />
        </div>
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="from" className="text-base font-medium">
            From
          </label>
          <DatePicker id="from" name="from" defaultValue={filters.from} placeholder="From" />
        </div>
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="to" className="text-base font-medium">
            To
          </label>
          <DatePicker id="to" name="to" defaultValue={filters.to} placeholder="To" />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {!ledger || ledger.lines.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No ledger lines"
          description="Post invoices, payments, expenses, purchases, or adjustments to populate this account."
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Journal</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.lines.map((line) => (
                <TableRow key={line.journalLineId}>
                  <TableCell className="font-mono text-sm">
                    {line.accountingDate}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/app/accounting/journals/${line.journalId}`}
                      className="font-medium hover:underline"
                    >
                      {line.sourceType}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {line.memo ?? line.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.debit.amountMinor > 0n ? (
                      <MoneyDisplay value={line.debit} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.credit.amountMinor > 0n ? (
                      <MoneyDisplay value={line.credit} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={line.balance} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
