import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityActivityPanel } from "@/components/business/entity-activity-panel";
import { formatDisplayDate } from "@/components/business/inventory-labels";
import { GstBreakdown } from "@/components/business/gst-breakdown";
import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import {
  SALES_ORDER_STATUS_LABELS,
  SALES_ORDER_STATUS_TONES,
} from "@/components/business/status-tone";
import { SalesOrderStatusActions } from "@/components/business/sales-order-status-actions";
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
  SalesOrderNotFoundError,
  getSalesOrder,
} from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

const audit = createPrismaAuditRepository(prisma);

export default async function SalesOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locked?: string }>;
}) {
  const tenant = await authorize("sales-order:read");
  const { id } = await params;
  const query = await searchParams;
  const canUpdate = roleHasPermission(tenant.membership.role, "sales-order:update");
  const canCancel = roleHasPermission(tenant.membership.role, "sales-order:cancel");
  const canCreateInvoice = roleHasPermission(tenant.membership.role, "invoice:create");

  let salesOrder;
  try {
    salesOrder = await getSalesOrder({
      tenantId: tenant.tenantId,
      salesOrderId: id,
      sales: prismaSalesRepository,
    });
  } catch (error) {
    if (error instanceof SalesOrderNotFoundError) {
      notFound();
    }
    throw error;
  }

  const placeOfSupply =
    GST_STATE_CODES[salesOrder.placeOfSupplyStateCode] ??
    salesOrder.placeOfSupplyStateCode;
  const convertedInvoice = await prismaSalesRepository.findInvoiceBySalesOrderId(
    tenant.tenantId,
    salesOrder.id
  );
  const activity = await audit.listForResource({
    tenantId: tenant.tenantId,
    resource: "sales_order",
    resourceId: salesOrder.id,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title={salesOrder.number}
        description={
          <Link
            href={`/app/sales/customers/${salesOrder.customerId}`}
            className="font-medium text-foreground hover:underline"
          >
            {salesOrder.customerName}
          </Link>
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge tone={SALES_ORDER_STATUS_TONES[salesOrder.status]}>
              {SALES_ORDER_STATUS_LABELS[salesOrder.status]}
            </StatusBadge>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/sales/orders" />}
            >
              Back
            </Button>
            {canUpdate && salesOrder.status === "DRAFT" ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/app/sales/orders/${salesOrder.id}/edit`} />}
              >
                Edit
              </Button>
            ) : null}
            <SalesOrderStatusActions
              salesOrderId={salesOrder.id}
              status={salesOrder.status}
              canUpdate={canUpdate}
              canCancel={canCancel}
              canCreateInvoice={canCreateInvoice}
            />
          </div>
        }
      />

      {query.locked ? (
        <p className="text-base text-muted-foreground">
          Only draft sales orders can be edited.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="p-0">
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
                {salesOrder.lines.map((line) => (
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
                taxableAmount={salesOrder.taxableAmount}
                cgst={salesOrder.cgst}
                sgst={salesOrder.sgst}
                igst={salesOrder.igst}
                totalTax={salesOrder.totalTax}
                grandTotal={salesOrder.grandTotal}
                supplyType={salesOrder.supplyType}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-base">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Status </span>
                {SALES_ORDER_STATUS_LABELS[salesOrder.status]}
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Date </span>
                {formatDisplayDate(salesOrder.issuedOn)}
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Expected </span>
                {salesOrder.expectedOn
                  ? formatDisplayDate(salesOrder.expectedOn)
                  : "—"}
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Place of supply </span>
                {placeOfSupply}
              </p>
              {salesOrder.quotationId ? (
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">From quotation </span>
                  <Link
                    href={`/app/sales/quotations/${salesOrder.quotationId}`}
                    className="font-medium hover:underline"
                  >
                    View quotation
                  </Link>
                </p>
              ) : null}
              {convertedInvoice ? (
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Invoice </span>
                  <Link
                    href={`/app/sales/invoices/${convertedInvoice.id}`}
                    className="font-medium hover:underline"
                  >
                    {convertedInvoice.number}
                  </Link>
                </p>
              ) : null}
              {salesOrder.notes ? <p>{salesOrder.notes}</p> : null}
            </CardContent>
          </Card>
          <EntityActivityPanel
            records={activity}
            timezone={tenant.business.timezone}
            emptyMessage="Sales order events will appear here after create, update, confirm, convert, or cancel."
          />
        </div>
      </div>
    </div>
  );
}
