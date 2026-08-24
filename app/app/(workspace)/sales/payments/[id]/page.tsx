import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDisplayDate } from "@/components/business/inventory-labels";
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
import { ApplyAdvanceForm } from "@/components/business/apply-advance-form";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import {
  getPayment,
  listOpenReceivableInvoices,
  PaymentNotFoundError,
  PAYMENT_METHOD_LABELS,
  unallocatedAmount,
} from "@/modules/payments";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("payment:read");
  const { id } = await params;
  const canApply = roleHasPermission(tenant.membership.role, "payment:create");

  let payment;
  try {
    payment = await getPayment({
      tenantId: tenant.tenantId,
      paymentId: id,
      payments: prismaPaymentRepository,
    });
  } catch (error) {
    if (error instanceof PaymentNotFoundError) {
      notFound();
    }
    throw error;
  }

  const unallocated = unallocatedAmount(payment);
  const openInvoices =
    canApply && unallocated.amountMinor > 0n
      ? await listOpenReceivableInvoices({
          tenantId: tenant.tenantId,
          customerId: payment.customerId,
          sales: prismaSalesRepository,
          payments: prismaPaymentRepository,
        })
      : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <PageHeader
        title={payment.number}
        description={
          <Link
            href={`/app/sales/customers/${payment.customerId}`}
            className="font-medium text-foreground hover:underline"
          >
            {payment.customerName}
          </Link>
        }
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/sales/payments" />}
          >
            Back
          </Button>
        }
      />

      <p className="text-base text-muted-foreground">
        Payments are recorded permanently. To correct a mistake, record an adjusting entry outside
        this receipt or contact your administrator.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          <CardHeader>
            <CardTitle>Allocations</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payment.allocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      Held as customer credit. Apply it to invoices when they are posted.
                    </TableCell>
                  </TableRow>
                ) : null}
                {payment.allocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell>
                      <Link
                        href={`/app/sales/invoices/${allocation.invoiceId}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {allocation.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay value={allocation.amount} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-base">
            <p className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Amount</span>
              <MoneyDisplay value={payment.amount} className="font-medium" />
            </p>
            {unallocated.amountMinor > 0n ? (
              <p className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Unallocated credit</span>
                <MoneyDisplay value={unallocated} className="font-medium" />
              </p>
            ) : null}
            <p className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Method</span>
              {PAYMENT_METHOD_LABELS[payment.method]}
            </p>
            <p className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Received</span>
              {formatDisplayDate(payment.receivedOn)}
            </p>
            {payment.reference ? (
              <p className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Reference</span>
                {payment.reference}
              </p>
            ) : null}
            {payment.notes ? (
              <p className="pt-2 text-muted-foreground">{payment.notes}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {canApply && unallocated.amountMinor > 0n ? (
        <Card>
          <CardHeader>
            <CardTitle>Apply credit</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplyAdvanceForm
              paymentId={payment.id}
              invoices={openInvoices}
              available={unallocated}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
