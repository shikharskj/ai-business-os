import Link from "next/link";
import { notFound } from "next/navigation";

import { ReverseJournalForm } from "@/components/business/reverse-journal-form";
import { MoneyDisplay } from "@/components/business/money-display";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getJournal, JournalNotFoundError } from "@/modules/accounting";
import { prismaJournalRepository } from "@/modules/accounting/infrastructure/prisma-accounting-repositories";
import { todayInTimezone } from "@/modules/shared-kernel/dates";

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("report:read");
  const { id } = await params;
  const canPost = roleHasPermission(tenant.membership.role, "accounting:post");

  let journal;
  try {
    journal = await getJournal({
      tenantId: tenant.tenantId,
      journalId: id,
      journals: prismaJournalRepository,
    });
  } catch (error) {
    if (error instanceof JournalNotFoundError) {
      notFound();
    }
    throw error;
  }

  const reversal = await prismaJournalRepository.findReversalOf(
    tenant.tenantId,
    journal.id
  );
  const canReverse = canPost && !journal.reversalOfJournalId && !reversal;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <PageHeader
        title={journal.memo ?? journal.sourceType}
        description={`${journal.sourceType} · ${journal.periodKey}`}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/accounting/journals" />}
          >
            Back
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <Card>
          <CardHeader>
            <CardTitle>Lines</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journal.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-sm">{line.accountCode}</TableCell>
                    <TableCell>{line.description ?? "—"}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-base">
              <p>
                <span className="text-muted-foreground">Date </span>
                {journal.accountingDate}
              </p>
              <p>
                <span className="text-muted-foreground">Period </span>
                <span className="font-mono">{journal.periodKey}</span>
              </p>
              <p>
                <span className="text-muted-foreground">FY </span>
                <span className="font-mono">{journal.financialYearKey}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Source </span>
                {journal.sourceType}
              </p>
              {journal.reversalOfJournalId ? (
                <p>
                  <span className="text-muted-foreground">Reversal of </span>
                  <Link
                    href={`/app/accounting/journals/${journal.reversalOfJournalId}`}
                    className="font-medium hover:underline"
                  >
                    original journal
                  </Link>
                </p>
              ) : null}
              {reversal ? (
                <p>
                  <span className="text-muted-foreground">Reversed by </span>
                  <Link
                    href={`/app/accounting/journals/${reversal.id}`}
                    className="font-medium hover:underline"
                  >
                    reversal journal
                  </Link>
                </p>
              ) : null}
            </CardContent>
          </Card>

          {canReverse ? (
            <Card>
              <CardHeader>
                <CardTitle>Reverse</CardTitle>
              </CardHeader>
              <CardContent>
                <ReverseJournalForm
                  journalId={journal.id}
                  today={todayInTimezone(tenant.business.timezone)}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
