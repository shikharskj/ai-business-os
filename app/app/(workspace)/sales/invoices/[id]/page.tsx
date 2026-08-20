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
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import { getInvoice, InvoiceNotFoundError, paymentStatusLabel } from "@/modules/sales";
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
        </div>
      </div>
    </div>
  );
}
