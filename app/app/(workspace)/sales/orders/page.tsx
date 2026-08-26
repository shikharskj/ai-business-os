import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";

import { SalesOrdersDataTable } from "@/components/business/sales-orders-data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { ListFilterClear } from "@/components/shell/list-filter-clear";
import {
  ListFilterBar,
  ListFilterField,
  ListFilterSearch,
} from "@/components/shell/list-filter-bar";
import { DatePicker } from "@/components/date-picker";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseListTableParams, toQueryString } from "@/lib/list-table-url";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import {
  SALES_ORDER_STATUSES,
  listSalesOrdersPage,
  salesOrderSearchSchema,
} from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { businessDate } from "@/modules/shared-kernel/dates";

const STATUS_FILTER_LABELS: Record<(typeof SALES_ORDER_STATUSES)[number] | "ALL", string> = {
  ALL: "All",
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  FULFILLED: "Fulfilled",
};

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    customerId?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("sales-order:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = salesOrderSearchSchema.safeParse({
    q: params.q,
    status: params.status,
    customerId: params.customerId,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : {
        q: "",
        status: "ALL" as const,
        customerId: undefined,
        from: undefined,
        to: undefined,
      };
  const canCreate = roleHasPermission(tenant.membership.role, "sales-order:create");
  const result = await listSalesOrdersPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    status: filters.status,
    customerId: filters.customerId,
    fromDate: filters.from ? businessDate(filters.from) : undefined,
    toDate: filters.to ? businessDate(filters.to) : undefined,
    page,
    pageSize,
    sales: prismaSalesRepository,
  });
  const hasFilters = Boolean(
    filters.q || filters.status !== "ALL" || filters.customerId || filters.from || filters.to
  );
  const queryString = toQueryString(params);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Sales orders"
        description="Confirm customer orders before billing. Stock and accounts still update only when you post an invoice."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/sales/orders/new" />}
            >
              <Plus className="size-5" />
              <span>New order</span>
            </Button>
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
              <label htmlFor="status" className="text-base font-medium">
                Status
              </label>
              <Select
                name="status"
                defaultValue={filters.status}
                items={STATUS_FILTER_LABELS}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_FILTER_LABELS).map(([value, label]) => (
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
            {hasFilters ? <ListFilterClear href="/app/sales/orders" /> : null}
          </>
        }
      />

      {result.total === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No matching sales orders" : "No sales orders yet"}
          description={
            hasFilters
              ? "Try a different number, customer, status, or date range."
              : "Create an order directly or convert an accepted quotation. Confirming does not move stock."
          }
          action={
            canCreate && !hasFilters ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/orders/new" />}
              >
                <Plus className="size-5" />
                <span>New order</span>
              </Button>
            ) : null
          }
        />
      ) : (
        <SalesOrdersDataTable
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
