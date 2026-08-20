import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";

import { MoneyDisplay } from "@/components/business/money-display";
import { EmptyState } from "@/components/shell/empty-state";
import { DatePicker } from "@/components/date-picker";
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
import { roleHasPermission } from "@/lib/security/permissions";
import { journalSearchSchema, listJournals } from "@/modules/accounting";
import { prismaJournalRepository } from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { businessDate, todayInTimezone } from "@/modules/shared-kernel/dates";
import { periodKeyFromDate } from "@/modules/accounting";

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; period?: string; from?: string; to?: string }>;
}) {
  const tenant = await authorize("report:read");
  const params = await searchParams;
  const parseResult = journalSearchSchema.safeParse({
    q: params.q,
    period: params.period || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", period: undefined, from: undefined, to: undefined };
  const canPost = roleHasPermission(tenant.membership.role, "accounting:post");
  const currentPeriod = periodKeyFromDate(todayInTimezone(tenant.business.timezone));
  const journals = await listJournals({
    filter: {
      tenantId: tenant.tenantId,
      query: filters.q,
      periodKey: filters.period,
      fromDate: filters.from ? businessDate(filters.from) : undefined,
      toDate: filters.to ? businessDate(filters.to) : undefined,
    },
    journals: prismaJournalRepository,
  });
  const hasFilters = Boolean(
    filters.q || filters.period || filters.from || filters.to
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Journals"
        description="Posted journals are immutable. Corrections use reversals or adjustment journals."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/accounting" />}
            >
              Back
            </Button>
            {canPost ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/accounting/journals/new" />}
              >
                <Plus className="size-5" />
                <span>Post adjustment</span>
              </Button>
            ) : null}
          </div>
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-2">
          <label htmlFor="q" className="text-base font-medium">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="Memo, source, or id..."
            leftIcon={<Search className="size-5" />}
          />
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

      {journals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No matching journals" : "No journals yet"}
          description={
            hasFilters
              ? "Try a different memo, period, or date range."
              : "Journals appear here when invoices, payments, expenses, purchases, or adjustments are posted."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead className="text-right">Debits</TableHead>
                <TableHead className="text-right">Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journals.map((journal) => (
                <TableRow key={journal.id}>
                  <TableCell>
                    <Link
                      href={`/app/accounting/journals/${journal.id}`}
                      className="font-mono text-sm font-medium hover:underline"
                    >
                      {journal.accountingDate}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{journal.periodKey}</TableCell>
                  <TableCell>{journal.sourceType}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {journal.memo ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={journal.totalDebits} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={journal.totalCredits} />
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
