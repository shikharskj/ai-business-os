import Link from "next/link";
import { notFound } from "next/navigation";

import { CreditNoteStatusActions } from "@/components/business/credit-note-status-actions";
import { EntityActivityPanel } from "@/components/business/entity-activity-panel";
import { GstBreakdown } from "@/components/business/gst-breakdown";
import { formatDisplayDate } from "@/components/business/inventory-labels";
import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import { CREDIT_NOTE_STATUS_TONES } from "@/components/business/status-tone";
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
import { prisma } from "@/lib/db";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { formatQuantity } from "@/modules/inventory";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import {
  CreditNoteNotFoundError,
  creditNoteStatusLabel,
  getCreditNote,
} from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

const audit = createPrismaAuditRepository(prisma);

export default async function CreditNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("credit-note:read");
  const { id } = await params;
  const canUpdate = roleHasPermission(tenant.membership.role, "credit-note:update");
  const canCancel = roleHasPermission(tenant.membership.role, "credit-note:cancel");
  const canReadJournal = roleHasPermission(tenant.membership.role, "report:read");

  let creditNote;
  try {
    creditNote = await getCreditNote({
      tenantId: tenant.tenantId,
      creditNoteId: id,
      sales: prismaSalesRepository,
    });
  } catch (error) {
    if (error instanceof CreditNoteNotFoundError) {
      notFound();
    }
    throw error;
  }

  const placeOfSupply =
    GST_STATE_CODES[creditNote.placeOfSupplyStateCode] ??
    creditNote.placeOfSupplyStateCode;
  const activity = await audit.listForResource({
    tenantId: tenant.tenantId,
    resource: "credit_note",
    resourceId: creditNote.id,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title={creditNote.number}
        description={creditNote.customerName}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge tone={CREDIT_NOTE_STATUS_TONES[creditNote.status]}>
              {creditNoteStatusLabel(creditNote.status)}
            </StatusBadge>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/sales/credit-notes" />}
            >
              Back
            </Button>
            {canUpdate && creditNote.status === "DRAFT" ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/app/sales/credit-notes/${creditNote.id}/edit`} />}
              >
                Edit
              </Button>
            ) : null}
            <CreditNoteStatusActions
              creditNoteId={creditNote.id}
              status={creditNote.status}
              canUpdate={canUpdate}
              canCancel={canCancel}
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="p-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditNote.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <p className="font-medium">{line.productName}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {line.sku}
                        {line.hsnSac ? ` · HSN ${line.hsnSac}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(line.quantity)} {line.unitOfMeasurement}
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={line.unitPrice} />
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={line.totalTax} />
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={line.lineTotal} />
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
              <CardTitle>GST breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <GstBreakdown
                taxableAmount={creditNote.taxableAmount}
                cgst={creditNote.cgst}
                sgst={creditNote.sgst}
                igst={creditNote.igst}
                totalTax={creditNote.totalTax}
                grandTotal={creditNote.grandTotal}
                supplyType={creditNote.supplyType}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-base">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Invoice </span>
                <Link
                  href={`/app/sales/invoices/${creditNote.invoiceId}`}
                  className="font-medium hover:underline"
                >
                  {creditNote.invoiceNumber}
                </Link>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Date </span>
                {formatDisplayDate(creditNote.issuedOn)}
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Place of supply </span>
                {placeOfSupply}
              </p>
              {creditNote.journalId && canReadJournal ? (
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Accounting </span>
                  <Link
                    href={`/app/accounting/journals/${creditNote.journalId}`}
                    className="font-medium hover:underline"
                  >
                    View journal
                  </Link>
                </p>
              ) : null}
              {creditNote.postedAt ? (
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Posted </span>
                  {creditNote.postedAt.toLocaleString("en-IN", {
                    timeZone: tenant.business.timezone,
                  })}
                </p>
              ) : null}
              {creditNote.notes ? <p>{creditNote.notes}</p> : null}
            </CardContent>
          </Card>
          <EntityActivityPanel
            records={activity}
            timezone={tenant.business.timezone}
            emptyMessage="Credit note events will appear here after create, update, post, or cancel."
          />
        </div>
      </div>
    </div>
  );
}
