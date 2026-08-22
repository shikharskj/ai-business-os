import Link from "next/link";
import { notFound } from "next/navigation";

import { BillStatusActions } from "@/components/business/bill-status-actions";
import { GstBreakdown } from "@/components/business/gst-breakdown";
import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import {
  PURCHASE_RETURN_STATUS_TONES,
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_TONES,
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
import {
  getPurchaseOutstanding,
  listPaymentsForPurchase,
  PAYMENT_METHOD_LABELS,
} from "@/modules/payments";
import { prismaSupplierPaymentRepository } from "@/modules/payments/infrastructure/prisma-supplier-payments-repository";
import {
  getPurchase,
  isPayablePurchaseStatus,
  isPostedPurchaseStatus,
  listPurchaseReturns,
  PurchaseNotFoundError,
  purchasePaymentStatusLabel,
  purchaseReturnStatusLabel,
} from "@/modules/purchases";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { money } from "@/modules/shared-kernel/money";

export default async function BillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await authorize("purchase:read");
  const { id } = await params;
  const query = await searchParams;
  const canUpdate = roleHasPermission(tenant.membership.role, "purchase:update");
  const canCancel = roleHasPermission(tenant.membership.role, "purchase:cancel");
  const canCreatePayment = roleHasPermission(tenant.membership.role, "payment:create");
  const canCreateReturn = roleHasPermission(tenant.membership.role, "purchase:create");
  const canReadPayments = roleHasPermission(tenant.membership.role, "payment:read");

  let purchase;
  try {
    purchase = await getPurchase({
      tenantId: tenant.tenantId,
      purchaseId: id,
      purchases: prismaPurchasesRepository,
    });
  } catch (error) {
    if (error instanceof PurchaseNotFoundError) {
      notFound();
    }
    throw error;
  }

  const placeOfSupply =
    GST_STATE_CODES[purchase.placeOfSupplyStateCode] ?? purchase.placeOfSupplyStateCode;
  const outstanding = await getPurchaseOutstanding({
    tenantId: tenant.tenantId,
    purchaseId: purchase.id,
    purchases: prismaPurchasesRepository,
    supplierPayments: prismaSupplierPaymentRepository,
  });
  const payments = canReadPayments
    ? await listPaymentsForPurchase({
        tenantId: tenant.tenantId,
        purchaseId: purchase.id,
        supplierPayments: prismaSupplierPaymentRepository,
      })
    : [];
  const returns = await listPurchaseReturns({
    tenantId: tenant.tenantId,
    purchaseId: purchase.id,
    purchases: prismaPurchasesRepository,
  });
  const canRecordPayment =
    canCreatePayment &&
    isPayablePurchaseStatus(purchase.status) &&
    (outstanding?.outstanding.amountMinor ?? 0n) > 0n;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <PageHeader
        title={purchase.number}
        description={purchase.supplierName}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge tone={PURCHASE_STATUS_TONES[purchase.status]}>
              {PURCHASE_STATUS_LABELS[purchase.status]}
            </StatusBadge>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/purchases/bills" />}
            >
              Back
            </Button>
            {canUpdate && purchase.status === "DRAFT" ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/app/purchases/bills/${purchase.id}/edit`} />}
              >
                Edit
              </Button>
            ) : null}
            {canCreateReturn && isPostedPurchaseStatus(purchase.status) ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={
                  <Link
                    href={`/app/purchases/returns/new?purchaseId=${purchase.id}`}
                  />
                }
              >
                Issue return
              </Button>
            ) : null}
            {canRecordPayment ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/app/purchases/payments/new?supplierId=${purchase.supplierId}&purchaseId=${purchase.id}`}
                  />
                }
              >
                Record payment
              </Button>
            ) : null}
            <BillStatusActions
              purchaseId={purchase.id}
              status={purchase.status}
              canUpdate={canUpdate}
              canCancel={canCancel}
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
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
                {purchase.lines.map((line) => (
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

        {returns.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Returns</CardTitle>
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
                  {returns.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href={`/app/purchases/returns/${row.id}`}
                          className="font-mono text-sm font-medium hover:underline"
                        >
                          {row.number}
                        </Link>
                      </TableCell>
                      <TableCell>{row.issuedOn}</TableCell>
                      <TableCell>
                        <StatusBadge tone={PURCHASE_RETURN_STATUS_TONES[row.status]}>
                          {purchaseReturnStatusLabel(row.status)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay value={row.grandTotal} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>GST breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <GstBreakdown
                taxableAmount={purchase.taxableAmount}
                cgst={purchase.cgst}
                sgst={purchase.sgst}
                igst={purchase.igst}
                totalTax={purchase.totalTax}
                grandTotal={purchase.grandTotal}
                supplyType={purchase.supplyType}
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
                {purchasePaymentStatusLabel(purchase.status)}
              </p>
              {outstanding && isPayablePurchaseStatus(purchase.status) ? (
                <p>
                  <span className="text-muted-foreground">Outstanding </span>
                  <MoneyDisplay value={outstanding.outstanding} className="font-medium" />
                </p>
              ) : null}
              <p>
                <span className="text-muted-foreground">Date </span>
                {purchase.issuedOn}
              </p>
              <p>
                <span className="text-muted-foreground">Due date </span>
                {purchase.dueOn ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Place of supply </span>
                {placeOfSupply}
              </p>
              <p>
                <span className="text-muted-foreground">Supplier </span>
                <Link
                  href={`/app/purchases/suppliers/${purchase.supplierId}`}
                  className="font-medium hover:underline"
                >
                  {purchase.supplierName}
                </Link>
              </p>
              {purchase.postedAt ? (
                <p>
                  <span className="text-muted-foreground">Posted </span>
                  {purchase.postedAt.toLocaleString("en-IN", {
                    timeZone: tenant.business.timezone,
                  })}
                </p>
              ) : null}
              {purchase.notes ? <p>{purchase.notes}</p> : null}
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
                      <TableHead>Payment</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const matchingAllocation = payment.allocations.find(
                        (row) => row.purchaseId === purchase.id
                      );
                      const allocated = matchingAllocation
                        ? matchingAllocation.amount
                        : money(0n, purchase.grandTotal.currency);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <Link
                              href={`/app/purchases/payments/${payment.id}`}
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
