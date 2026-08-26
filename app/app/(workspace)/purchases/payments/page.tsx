import { Banknote, Plus, Search } from "lucide-react";
import Link from "next/link";

import { SupplierPaymentsDataTable } from "@/components/business/supplier-payments-data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { DatePicker } from "@/components/date-picker";
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
  listSupplierPaymentsPage,
  supplierPaymentSearchSchema,
  PAYMENT_METHOD_LABELS,
} from "@/modules/payments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { prismaSupplierPaymentRepository } from "@/modules/payments/infrastructure/prisma-supplier-payments-repository";
import { businessDate } from "@/modules/shared-kernel/dates";

export default async function PurchasePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    method?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("payment:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = supplierPaymentSearchSchema.safeParse({
    q: params.q,
    method: params.method,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", method: "ALL" as const, from: undefined, to: undefined };
  const canCreate = roleHasPermission(tenant.membership.role, "payment:create");
  const result = await listSupplierPaymentsPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    method: filters.method === "ALL" ? undefined : filters.method,
    fromDate: filters.from ? businessDate(filters.from) : undefined,
    toDate: filters.to ? businessDate(filters.to) : undefined,
    page,
    pageSize,
    supplierPayments: prismaSupplierPaymentRepository,
  });
  const hasFilters = Boolean(
    filters.q || filters.method !== "ALL" || filters.from || filters.to
  );
  const queryString = toQueryString(params);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Supplier payments"
        description="Supplier payments allocated to unpaid purchase bills. No payment gateway."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/purchases/payments/new" />}
            >
              <Plus className="size-5" />
              <span>Record payment</span>
            </Button>
          ) : null
        }
      />

      <ListFilterBar
        hiddenFields={
          pageSize !== 10 ? (
            <input type="hidden" name="pageSize" value={pageSize} />
          ) : null
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
              placeholder="Number or supplier..."
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
              <DatePicker id="to" name="to" defaultValue={filters.to} placeholder="To" />
            </ListFilterField>
          </>
        }
        actions={
          <Button type="submit" variant="outline">
            Filter
          </Button>
        }
      />

      {result.total === 0 ? (
        <EmptyState
          icon={Banknote}
          title={hasFilters ? "No matching payments" : "No payments yet"}
          description={
            hasFilters
              ? "Try a different payment number, supplier, method, or date range."
              : "Record a supplier payment against unpaid purchase bills. Partial payments are supported."
          }
          action={
            canCreate && !hasFilters ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/purchases/payments/new" />}
              >
                <Plus className="size-5" />
                <span>Record payment</span>
              </Button>
            ) : null
          }
        />
      ) : (
        <SupplierPaymentsDataTable
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
