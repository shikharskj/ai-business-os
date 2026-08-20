import Link from "next/link";
import { notFound } from "next/navigation";

import { GstBreakdown } from "@/components/business/gst-breakdown";
import { MoneyDisplay } from "@/components/business/money-display";
import { InvoiceStatusActions } from "@/components/business/invoice-status-actions";
import { StatusBadge } from "@/components/business/status-badge";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
} from "@/components/business/status-tone";
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
import { formatQuantity } from "@/modules/inventory";
import {
  getInvoiceOutstanding,
  listPaymentsForInvoice,
  PAYMENT_METHOD_LABELS,
} from "@/modules/payments";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { money } from "@/modules/shared-kernel/money";
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import {
  getInvoice,
  InvoiceNotFoundError,
  isReceivableInvoiceStatus,
  paymentStatusLabel,
} from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await authorize("invoice:read");
  const { id } = await params;
  const query = await searchParams;
  const canUpdate = roleHasPermission(tenant.membership.role, "invoice:update");
  const canCancel = roleHasPermission(tenant.membership.role, "invoice:cancel");
  const canRead = roleHasPermission(tenant.membership.role, "invoice:read");
  const canCreatePayment = roleHasPermission(tenant.membership.role, "payment:create");
  const canReadPayments = roleHasPermission(tenant.membership.role, "payment:read");

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
    GST_STATE_CODES[invoice.placeOfSupplyStateCode] ?? invoice.placeOfSupplyStateCode;
  const outstanding = await getInvoiceOutstanding({
    tenantId: tenant.tenantId,
    invoiceId: invoice.id,
    sales: prismaSalesRepository,
    payments: prismaPaymentRepository,
  });
  const payments = canReadPayments
    ? await listPaymentsForInvoice({
        tenantId: tenant.tenantId,
        invoiceId: invoice.id,
        payments: prismaPaymentRepository,
      })
    : [];
  const canRecordPayment =
    canCreatePayment &&
    isReceivableInvoiceStatus(invoice.status) &&
    (outstanding?.outstanding.amountMinor ?? 0n) > 0n;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title={invoice.number}
        description={invoice.customerName}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge tone={INVOICE_STATUS_TONES[invoice.status]}>
              {INVOICE_STATUS_LABELS[invoice.status]}
            </StatusBadge>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/sales/invoices" />}
            >
              Back
            </Button>
            {canUpdate && invoice.status === "DRAFT" ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/app/sales/invoices/${invoice.id}/edit`} />}
              >
                Edit
              </Button>
            ) : null}
            {canRecordPayment ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/app/sales/payments/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`}
                  />
                }
              >
                Record payment
              </Button>
            ) : null}
            <InvoiceStatusActions
              invoiceId={invoice.id}
              status={invoice.status}
              canUpdate={canUpdate}
              canCancel={canCancel}
              canRead={canRead}
            />
          </div>
        }
      />

      {query.saved ? (
        <p className="text-base text-muted-foreground">
          Invoice saved. GST totals were recalculated by the tax engine.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Lines</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
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
              <p>
                <span className="text-muted-foreground">Payment </span>
                {paymentStatusLabel(invoice.status)}
              </p>
              {outstanding && isReceivableInvoiceStatus(invoice.status) ? (
                <p>
                  <span className="text-muted-foreground">Outstanding </span>
                  <MoneyDisplay value={outstanding.outstanding} className="font-medium" />
                </p>
              ) : null}
              <p>
                <span className="text-muted-foreground">Date </span>
                {invoice.issuedOn}
              </p>
              <p>
                <span className="text-muted-foreground">Due date </span>
                {invoice.dueOn ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Place of supply </span>
                {placeOfSupply}
              </p>
              {invoice.quotationId ? (
                <p>
                  <span className="text-muted-foreground">From quotation </span>
                  <Link
                    href={`/app/sales/quotations/${invoice.quotationId}`}
                    className="font-medium hover:underline"
                  >
                    View quotation
                  </Link>
                </p>
              ) : null}
              {invoice.postedAt ? (
                <p>
                  <span className="text-muted-foreground">Posted </span>
                  {invoice.postedAt.toLocaleString("en-IN", {
                    timeZone: tenant.business.timezone,
                  })}
                </p>
              ) : null}
              {invoice.notes ? <p>{invoice.notes}</p> : null}
            </CardContent>
          </Card>
          {canReadPayments && payments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const allocated =
                        payment.allocations.find((row) => row.invoiceId === invoice.id)
                          ?.amount ?? money(0n, payment.amount.currency);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <Link
                              href={`/app/sales/payments/${payment.id}`}
                              className="font-mono text-sm font-medium hover:underline"
                            >
                              {payment.number}
                            </Link>
                          </TableCell>
                          <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
                          <TableCell className="text-right">
                            <MoneyDisplay value={allocated} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
