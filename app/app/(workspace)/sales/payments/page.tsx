import { Banknote, Plus, Search } from "lucide-react";
import Link from "next/link";

import { PaymentsDataTable } from "@/components/business/payments-data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseListTableParams, toQueryString } from "@/lib/list-table-url";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { listPaymentsPage, paymentSearchSchema } from "@/modules/payments";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";

export default async function SalesPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("payment:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = paymentSearchSchema.safeParse({ q: params.q });
  const filters = parseResult.success ? parseResult.data : { q: "" };
  const canCreate = roleHasPermission(tenant.membership.role, "payment:create");
  const result = await listPaymentsPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    page,
    pageSize,
    payments: prismaPaymentRepository,
  });
  const hasFilters = Boolean(filters.q);
  const queryString = toQueryString(params);

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
        {pageSize !== 10 ? (
          <input type="hidden" name="pageSize" value={pageSize} />
        ) : null}
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

      {result.total === 0 ? (
        <EmptyState
          icon={Banknote}
          title={hasFilters ? "No matching payments" : "No payments yet"}
          description={
            hasFilters
              ? "Try a different receipt number or customer name."
              : "Record a customer payment against unpaid invoices. Partial payments are supported."
          }
          action={
            canCreate && !hasFilters ? (
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
        <PaymentsDataTable
          items={result.items}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          queryString={queryString}
        />
      )}
    </div>
  );
}
