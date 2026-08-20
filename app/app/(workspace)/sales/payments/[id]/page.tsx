import Link from "next/link";
import { notFound } from "next/navigation";

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
import { getPayment, PaymentNotFoundError, PAYMENT_METHOD_LABELS } from "@/modules/payments";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await authorize("payment:read");
  const { id } = await params;

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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <PageHeader
        title={payment.number}
        description={payment.customerName}
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
            <p>
              <span className="text-muted-foreground">Amount </span>
              <MoneyDisplay value={payment.amount} className="font-medium" />
            </p>
            <p>
              <span className="text-muted-foreground">Method </span>
              {PAYMENT_METHOD_LABELS[payment.method]}
            </p>
            <p>
              <span className="text-muted-foreground">Received </span>
              {payment.receivedOn}
            </p>
            {payment.reference ? (
              <p>
                <span className="text-muted-foreground">Reference </span>
                {payment.reference}
              </p>
            ) : null}
            <p>
              <Link
                href={`/app/sales/customers/${payment.customerId}`}
                className="font-medium hover:underline"
              >
                View customer
              </Link>
            </p>
            {payment.notes ? <p>{payment.notes}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
