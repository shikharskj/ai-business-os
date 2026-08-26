import { Banknote, Plus, Search } from "lucide-react";
import Link from "next/link";

import { PaymentsDataTable } from "@/components/business/payments-data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { DatePicker } from "@/components/date-picker";
import { ListFilterClear } from "@/components/shell/list-filter-clear";
import {
  ListFilterBar,
  ListFilterField,
  ListFilterSearch,
} from "@/components/shell/list-filter-bar";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseListTableParams, toQueryString } from "@/lib/list-table-url";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import {
  listPaymentsPage,
  paymentSearchSchema,
  PAYMENT_METHOD_LABELS,
} from "@/modules/payments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { prismaPaymentRepository } from "@/modules/payments/infrastructure/prisma-payments-repository";
import { businessDate } from "@/modules/shared-kernel/dates";

export default async function SalesPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    method?: string;
    customerId?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("payment:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = paymentSearchSchema.safeParse({
    q: params.q,
    method: params.method,
    customerId: params.customerId,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", method: "ALL" as const, customerId: undefined, from: undefined, to: undefined };
  const canCreate = roleHasPermission(tenant.membership.role, "payment:create");
  const result = await listPaymentsPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    customerId: filters.customerId,
    method: filters.method === "ALL" ? undefined : filters.method,
    fromDate: filters.from ? businessDate(filters.from) : undefined,
    toDate: filters.to ? businessDate(filters.to) : undefined,
    page,
    pageSize,
    payments: prismaPaymentRepository,
  });
  const hasFilters = Boolean(
    filters.q ||
      filters.method !== "ALL" ||
      filters.customerId ||
      filters.from ||
      filters.to
  );
  const queryString = toQueryString(params);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Customer payments"
        description="Customer receipts allocated to invoices, or held as advances. No payment gateway."
        actions={
          canCreate ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href="/app/sales/payments/new?advance=1" />}
              >
                Record advance
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/payments/new" />}
              >
                <Plus className="size-5" />
                <span>Record payment</span>
              </Button>
            </div>
          ) : null
        }
      />

      <ListFilterBar
        hiddenFields={
          <>
            {pageSize !== 10 ? (
              <input type="hidden" name="pageSize" value={pageSize} />
            ) : null}
            {filters.customerId ? (
              <input type="hidden" name="customerId" value={filters.customerId} />
            ) : null}
          </>
        }
        search={
          <ListFilterSearch>
            <label htmlFor="q" className="text-base font-medium">
              Search
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Number or customer..."
              leftIcon={<Search className="size-5" />}
            />
          </ListFilterSearch>
        }
        filters={
          <>
            <ListFilterField>
              <label htmlFor="method" className="text-base font-medium">
                Method
              </label>
              <Select
                name="method"
                defaultValue={filters.method}
                items={{ ALL: "All methods", ...PAYMENT_METHOD_LABELS }}
              >
                <SelectTrigger id="method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All methods</SelectItem>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ListFilterField>
            <ListFilterField className="md:w-44">
              <label htmlFor="from" className="text-base font-medium">
                From
              </label>
              <DatePicker
                id="from"
                name="from"
                defaultValue={filters.from}
                placeholder="From"
              />
            </ListFilterField>
            <ListFilterField className="md:w-44">
              <label htmlFor="to" className="text-base font-medium">
                To
              </label>
              <DatePicker
                id="to"
                name="to"
                defaultValue={filters.to}
                placeholder="To"
              />
            </ListFilterField>
          </>
        }
        actions={
          <>
            <Button type="submit" variant="outline">
              Filter
            </Button>
            {hasFilters ? <ListFilterClear href="/app/sales/payments" /> : null}
          </>
        }
      />

      {result.total === 0 ? (
        <EmptyState
          icon={Banknote}
          title={hasFilters ? "No matching payments" : "No payments yet"}
          description={
            hasFilters
              ? "Try a different receipt number, customer, method, or date range."
              : "Record a customer payment against unpaid invoices, or an advance to hold as credit."
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
