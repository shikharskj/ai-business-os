import Link from "next/link";
import { notFound } from "next/navigation";

import { GstBreakdown } from "@/components/business/gst-breakdown";
import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import {
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUS_TONES,
} from "@/components/business/status-tone";
import { QuotationStatusActions } from "@/components/business/quotation-status-actions";
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
import { getQuotation, QuotationNotFoundError } from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function QuotationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await authorize("quotation:read");
  const { id } = await params;
  const query = await searchParams;
  const canUpdate = roleHasPermission(tenant.membership.role, "quotation:update");
  const canCancel = roleHasPermission(tenant.membership.role, "quotation:cancel");

  let quotation;
  try {
    quotation = await getQuotation({
      tenantId: tenant.tenantId,
      quotationId: id,
      sales: prismaSalesRepository,
    });
  } catch (error) {
    if (error instanceof QuotationNotFoundError) {
      notFound();
    }
    throw error;
  }

  const placeOfSupply =
    GST_STATE_CODES[quotation.placeOfSupplyStateCode] ?? quotation.placeOfSupplyStateCode;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title={quotation.number}
        description={quotation.customerName}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge tone={QUOTATION_STATUS_TONES[quotation.status]}>
              {QUOTATION_STATUS_LABELS[quotation.status]}
            </StatusBadge>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/sales/quotations" />}
            >
              Back
            </Button>
            {canUpdate && quotation.status === "DRAFT" ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/app/sales/quotations/${quotation.id}/edit`} />}
              >
                Edit
              </Button>
            ) : null}
            <QuotationStatusActions
              quotationId={quotation.id}
              status={quotation.status}
              canUpdate={canUpdate}
              canCancel={canCancel}
            />
          </div>
        }
      />

      {query.saved ? (
        <p className="text-base text-muted-foreground">Quotation saved. GST totals were recalculated by the tax engine.</p>
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
                {quotation.lines.map((line) => (
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
              <CardTitle>GST preview</CardTitle>
            </CardHeader>
            <CardContent>
              <GstBreakdown
                taxableAmount={quotation.taxableAmount}
                cgst={quotation.cgst}
                sgst={quotation.sgst}
                igst={quotation.igst}
                totalTax={quotation.totalTax}
                grandTotal={quotation.grandTotal}
                supplyType={quotation.supplyType}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-base">
              <p>
                <span className="text-muted-foreground">Date </span>
                {quotation.issuedOn}
              </p>
              <p>
                <span className="text-muted-foreground">Valid until </span>
                {quotation.validUntil ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Place of supply </span>
                {placeOfSupply}
              </p>
              {quotation.notes ? <p>{quotation.notes}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
