import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityActivityPanel } from "@/components/business/entity-activity-panel";
import {
  InvoiceDocumentPreview,
} from "@/components/business/invoice-document";
import { formatDisplayDate } from "@/components/business/inventory-labels";
import { GstBreakdown } from "@/components/business/gst-breakdown";
import { MoneyDisplay } from "@/components/business/money-display";
import { InvoiceStatusActions } from "@/components/business/invoice-status-actions";
import { StatusBadge } from "@/components/business/status-badge";
import {
  CREDIT_NOTE_STATUS_TONES,
  invoicePaymentBadgePresentation,
} from "@/components/business/status-tone";
import { PageHeader } from "@/components/shell/page-header";
import {
  DocumentFormPreviewAside,
  DocumentFormPreviewLayout,
  DocumentFormPreviewMain,
  DocumentPreviewPageShell,
} from "@/components/shell/document-form-preview-layout";
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
import { ApplyAdvanceForm } from "@/components/business/apply-advance-form";
import {
  getCustomerAdvance,
  getInvoiceOutstanding,
  listPaymentsForInvoice,
  PAYMENT_METHOD_LABELS,
} from "@/modules/payments";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { createPrismaAuditRepository } from "@/modules/shared-kernel/audit";
import { money } from "@/modules/shared-kernel/money";
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import {
  buildInvoiceDocumentView,
  getInvoice,
  InvoiceNotFoundError,
  isInvoiceOverdue,
  isPostedInvoiceStatus,
  isReceivableInvoiceStatus,
  listCreditNotes,
  paymentStatusLabel,
  creditNoteStatusLabel,
} from "@/modules/sales";
import { businessDate, todayInTimezone } from "@/modules/shared-kernel/dates";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { businessLogoUrl } from "@/modules/tenant";

const audit = createPrismaAuditRepository(prisma);

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; locked?: string }>;
}) {
  const tenant = await authorize("invoice:read");
  const { id } = await params;
  const query = await searchParams;
  const canUpdate = roleHasPermission(tenant.membership.role, "invoice:update");
  const canCancel = roleHasPermission(tenant.membership.role, "invoice:cancel");
  const canRead = roleHasPermission(tenant.membership.role, "invoice:read");
  const canCreateCreditNote = roleHasPermission(
    tenant.membership.role,
    "credit-note:create",
  );
  const canCreatePayment = roleHasPermission(
    tenant.membership.role,
    "payment:create",
  );
  const canReadPayments = roleHasPermission(
    tenant.membership.role,
    "payment:read",
  );
  const canReadJournal = roleHasPermission(
    tenant.membership.role,
    "report:read",
  );

  let invoice;
  try {
    invoice = await getInvoice({
      tenantId: tenant.tenantId,
      invoiceId: id,
      sales: prismaSalesRepository,
    });
  } catch (error) {
    if (error instanceof InvoiceNotFoundError) {
      notFound();
    }
    throw error;
  }

  const placeOfSupply =
    GST_STATE_CODES[invoice.placeOfSupplyStateCode] ??
    invoice.placeOfSupplyStateCode;
  const [outstanding, advance] = await Promise.all([
    getInvoiceOutstanding({
      tenantId: tenant.tenantId,
      invoiceId: invoice.id,
      sales: prismaSalesRepository,
      payments: prismaPaymentRepository,
    }),
    getCustomerAdvance({
      tenantId: tenant.tenantId,
      customerId: invoice.customerId,
      payments: prismaPaymentRepository,
    }),
  ]);
  const customer = await prismaPartyRepository.findCustomerById(
    tenant.tenantId,
    invoice.customerId,
  );
  const documentView = buildInvoiceDocumentView({
    number: invoice.number,
    issuedOn: invoice.issuedOn,
    dueOn: invoice.dueOn,
    notes: invoice.notes,
    placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
    seller: tenant.business,
    buyer: customer,
    logoUrl: businessLogoUrl(tenant.business.logoDocumentId),
    prepared: invoice,
  });
  const payments = canReadPayments
    ? await listPaymentsForInvoice({
        tenantId: tenant.tenantId,
        invoiceId: invoice.id,
        payments: prismaPaymentRepository,
      })
    : [];
  const creditNotes = await listCreditNotes({
    tenantId: tenant.tenantId,
    invoiceId: invoice.id,
    sales: prismaSalesRepository,
  });
  const activity = await audit.listForResource({
    tenantId: tenant.tenantId,
    resource: "invoice",
    resourceId: invoice.id,
  });
  const canRecordPayment =
    canCreatePayment &&
    isReceivableInvoiceStatus(invoice.status) &&
    (outstanding?.outstanding.amountMinor ?? 0n) > 0n;
  const showReceivableSummary =
    outstanding != null && isReceivableInvoiceStatus(invoice.status);
  const recordPaymentHref = `/app/sales/payments/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`;
  const asOf = businessDate(todayInTimezone(tenant.business.timezone));
  const isOverdue =
    outstanding != null &&
    isInvoiceOverdue({
      dueOn: invoice.dueOn,
      status: invoice.status,
      outstandingMinor: outstanding.outstanding.amountMinor,
      asOf,
    });
  const paymentBadge = invoicePaymentBadgePresentation(invoice.status);

  return (
    <DocumentPreviewPageShell>
      <PageHeader
        title={invoice.number}
        description={
          customer ? (
            <Link
              href={`/app/sales/customers/${invoice.customerId}`}
              className="font-medium text-foreground hover:underline"
            >
              {invoice.customerName}
            </Link>
          ) : (
            invoice.customerName
          )
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge tone={paymentBadge.tone}>{paymentBadge.label}</StatusBadge>
            {canRecordPayment ? (
              <Button
                nativeButton={false}
                render={<Link href={recordPaymentHref} />}
              >
                Record payment
              </Button>
            ) : canUpdate && invoice.status === "DRAFT" ? (
              <Button
                nativeButton={false}
                render={
                  <Link href={`/app/sales/invoices/${invoice.id}/edit`} />
                }
              >
                Edit
              </Button>
            ) : null}
            <InvoiceStatusActions
              invoiceId={invoice.id}
              status={invoice.status}
              canUpdate={canUpdate}
              canCancel={canCancel}
              canRead={canRead}
              exportInMenu={canRecordPayment}
              moreItems={[
                { href: "/app/sales/invoices", label: "Back to invoices" },
                ...(canUpdate &&
                invoice.status === "DRAFT" &&
                canRecordPayment
                  ? [
                      {
                        href: `/app/sales/invoices/${invoice.id}/edit`,
                        label: "Edit",
                      },
                    ]
                  : []),
                ...(canCreateCreditNote && isPostedInvoiceStatus(invoice.status)
                  ? [
                      {
                        href: `/app/sales/credit-notes/new?invoiceId=${invoice.id}`,
                        label: "Issue credit note",
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        }
      />

      {query.locked ? (
        <p className="text-base text-muted-foreground">
          Posted invoices cannot be edited. Use a credit note to correct amounts after posting.
        </p>
      ) : null}

      <DocumentFormPreviewLayout className="gap-8">
        <DocumentFormPreviewMain className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>GST breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <GstBreakdown
                  taxableAmount={invoice.taxableAmount}
                  cgst={invoice.cgst}
                  sgst={invoice.sgst}
                  igst={invoice.igst}
                  totalTax={invoice.totalTax}
                  grandTotal={invoice.grandTotal}
                  supplyType={invoice.supplyType}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-base">
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payment </span>
                  {paymentStatusLabel(invoice.status)}
                </p>
                {showReceivableSummary ? (
                  <>
                    <p className="flex items-center justify-between">
                      <span className="text-muted-foreground">Allocated </span>
                      <MoneyDisplay
                        value={outstanding.allocated}
                        className="font-medium"
                      />
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-muted-foreground">Outstanding </span>
                      <MoneyDisplay
                        value={outstanding.outstanding}
                        className="font-medium"
                      />
                    </p>
                  </>
                ) : null}
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date </span>
                  {formatDisplayDate(invoice.issuedOn)}
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due date </span>
                  <span className="flex items-center gap-2">
                    {invoice.dueOn ? formatDisplayDate(invoice.dueOn) : "—"}
                    {isOverdue ? (
                      <StatusBadge tone="warning">Overdue</StatusBadge>
                    ) : null}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Place of supply{" "}
                  </span>
                  {placeOfSupply}
                </p>
                {invoice.quotationId ? (
                  <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      From quotation{" "}
                    </span>
                    <Link
                      href={`/app/sales/quotations/${invoice.quotationId}`}
                      className="font-medium hover:underline"
                    >
                      View quotation
                    </Link>
                  </p>
                ) : null}
                {invoice.salesOrderId ? (
                  <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      From order{" "}
                    </span>
                    <Link
                      href={`/app/sales/orders/${invoice.salesOrderId}`}
                      className="font-medium hover:underline"
                    >
                      View sales order
                    </Link>
                  </p>
                ) : null}
                {invoice.journalId && canReadJournal ? (
                  <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">Accounting </span>
                    <Link
                      href={`/app/accounting/journals/${invoice.journalId}`}
                      className="font-medium hover:underline"
                    >
                      View journal
                    </Link>
                  </p>
                ) : null}
                {invoice.postedAt ? (
                  <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">Posted </span>
                    {invoice.postedAt.toLocaleString("en-IN", {
                      timeZone: tenant.business.timezone,
                    })}
                  </p>
                ) : null}
                {invoice.notes ? <p>{invoice.notes}</p> : null}
              </CardContent>
            </Card>
          </div>

          <Card className="p-0">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Tax rate</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines.map((line) => (
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
                        <MoneyDisplay value={line.discount} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(line.taxRateBps / 100).toFixed(2)}%
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

          {creditNotes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Credit notes</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditNotes.map((note) => (
                      <TableRow key={note.id}>
                        <TableCell>
                          <Link
                            href={`/app/sales/credit-notes/${note.id}`}
                            className="font-mono text-sm font-medium hover:underline"
                          >
                            {note.number}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDisplayDate(note.issuedOn)}</TableCell>
                        <TableCell>
                          <StatusBadge tone={CREDIT_NOTE_STATUS_TONES[note.status]}>
                            {creditNoteStatusLabel(note.status)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay value={note.grandTotal} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {canReadPayments ? (
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              {payments.length === 0 ? (
                <CardContent className="flex flex-col gap-3">
                  <p className="text-base text-muted-foreground">
                    No payments recorded yet.
                  </p>
                  {canRecordPayment ? (
                    <div>
                      <Button
                        nativeButton={false}
                        render={<Link href={recordPaymentHref} />}
                      >
                        Record payment
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              ) : (
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Allocated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => {
                        const allocated =
                          payment.allocations.find(
                            (row) => row.invoiceId === invoice.id,
                          )?.amount ?? money(0n, payment.amount.currency);
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {formatDisplayDate(payment.receivedOn)}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/app/sales/payments/${payment.id}`}
                                className="font-mono text-sm font-medium hover:underline"
                              >
                                {payment.number}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {PAYMENT_METHOD_LABELS[payment.method]}
                            </TableCell>
                            <TableCell className="text-right">
                              <MoneyDisplay value={allocated} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
              {canCreatePayment &&
              outstanding &&
              outstanding.outstanding.amountMinor > 0n &&
              advance.unallocated.amountMinor > 0n &&
              isReceivableInvoiceStatus(invoice.status) ? (
                <CardContent className={payments.length > 0 ? "border-t border-border pt-6" : undefined}>
                  <ApplyAdvanceForm
                    customerId={invoice.customerId}
                    available={advance.unallocated}
                    invoices={[outstanding]}
                  />
                </CardContent>
              ) : null}
            </Card>
          ) : null}
        </DocumentFormPreviewMain>

        <DocumentFormPreviewAside className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Preview
            </p>
            <div className="max-h-[min(70vh,36rem)] overflow-auto rounded-xl bg-muted/40 p-2">
              <InvoiceDocumentPreview view={documentView} />
            </div>
          </div>
          <EntityActivityPanel
            records={activity}
            timezone={tenant.business.timezone}
            emptyMessage="Invoice events will appear here after create, update, post, or cancel."
          />
        </DocumentFormPreviewAside>
      </DocumentFormPreviewLayout>
    </DocumentPreviewPageShell>
  );
}
