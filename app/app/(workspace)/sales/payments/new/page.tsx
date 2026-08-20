import Link from "next/link";

import { RecordPaymentForm } from "@/components/business/record-payment-form";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { listCustomers } from "@/modules/party";
import { prismaPartyRepository } from "@/modules/party/infrastructure/prisma-party-repository";
import { listOpenReceivableInvoices } from "@/modules/payments";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; invoiceId?: string }>;
}) {
  const tenant = await authorize("payment:create");
  const params = await searchParams;
  const customers = await listCustomers({
    tenantId: tenant.tenantId,
    status: "ACTIVE",
    parties: prismaPartyRepository,
  });
  const selectedCustomerId =
    params.customerId && customers.some((customer) => customer.id === params.customerId)
      ? params.customerId
      : (customers[0]?.id ?? "");

  const invoices = selectedCustomerId
    ? await listOpenReceivableInvoices({
        tenantId: tenant.tenantId,
        customerId: selectedCustomerId,
        sales: prismaSalesRepository,
        payments: prismaPaymentRepository,
      })
    : [];

  const selectedInvoiceId = invoices.some((invoice) => invoice.invoiceId === params.invoiceId)
    ? params.invoiceId
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <PageHeader
        title="Record payment"
        description="Allocate the amount received to unpaid invoices. Cash, UPI, bank transfer, card, and cheque are recorded as labels only."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/sales/payments" />}
          >
            Back to payments
          </Button>
        }
      />
      {customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8 text-base">
            <p>Add an active customer before recording a payment.</p>
            <div>
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/customers/new" />}
              >
                New customer
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <RecordPaymentForm
              today={todayInTimezone(tenant.business.timezone)}
              selectedCustomerId={selectedCustomerId}
              selectedInvoiceId={selectedInvoiceId}
              customers={customers.map((customer) => ({
                id: customer.id,
                name: customer.name,
              }))}
              invoices={invoices}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
