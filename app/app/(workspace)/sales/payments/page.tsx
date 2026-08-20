import { Banknote, Plus, Search } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { MoneyDisplay } from "@/components/business/money-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  listPayments,
  paymentSearchSchema,
  PAYMENT_METHOD_LABELS,
} from "@/modules/payments";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";

export default async function SalesPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const tenant = await authorize("payment:read");
  const params = await searchParams;
  const parseResult = paymentSearchSchema.safeParse({ q: params.q });
  const filters = parseResult.success ? parseResult.data : { q: "" };
  const canCreate = roleHasPermission(tenant.membership.role, "payment:create");
  const payments = await listPayments({
    tenantId: tenant.tenantId,
    query: filters.q,
    payments: prismaPaymentRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Payments"
        description="Customer receipts allocated to unpaid invoices. No payment gateway."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/sales/payments/new" />}
            >
              <Plus className="size-5" />
              <span>Record payment</span>
            </Button>
          ) : null
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-2">
          <label htmlFor="q" className="text-base font-medium">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="Number or customer..."
            className="max-w-xl"
            leftIcon={<Search className="size-5" />}
          />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {payments.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title={filters.q ? "No matching payments" : "No payments yet"}
          description={
            filters.q
              ? "Try a different receipt number or customer name."
              : "Record a customer payment against unpaid invoices. Partial payments are supported."
          }
          action={
            canCreate && !filters.q ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/payments/new" />}
              >
                <Plus className="size-5" />
                <span>Record payment</span>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Link
                      href={`/app/sales/payments/${payment.id}`}
                      className="font-mono text-sm font-medium hover:underline"
                    >
                      {payment.number}
                    </Link>
                  </TableCell>
                  <TableCell>{payment.customerName}</TableCell>
                  <TableCell>{payment.receivedOn}</TableCell>
                  <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={payment.amount} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
