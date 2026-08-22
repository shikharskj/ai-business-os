import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";

import { QuotationsDataTable } from "@/components/business/quotations-data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { ListFilterClear } from "@/components/shell/list-filter-clear";
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
import { listQuotationsPage, quotationSearchSchema } from "@/modules/sales";
import { prismaSalesRepository } from "@/modules/sales/infrastructure/prisma-sales-repository";
import { businessDate } from "@/modules/shared-kernel/dates";

export default async function QuotationsPage({
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
  const tenant = await authorize("quotation:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = quotationSearchSchema.safeParse({
    q: params.q,
    status: params.status,
    customerId: params.customerId,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", status: "ALL" as const, customerId: undefined, from: undefined, to: undefined };
  const canCreate = roleHasPermission(tenant.membership.role, "quotation:create");
  const result = await listQuotationsPage({
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
        title="Quotations"
        description="Sales quotes with GST preview, live document preview, and PDF export after send."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/sales/quotations/new" />}
            >
              <Plus className="size-5" />
              <span>New quotation</span>
            </Button>
          ) : null
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        {pageSize !== 10 ? (
          <input type="hidden" name="pageSize" value={pageSize} />
        ) : null}
        {filters.customerId ? (
          <input type="hidden" name="customerId" value={filters.customerId} />
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
        <div className="flex w-48 flex-col gap-2">
          <label htmlFor="status" className="text-base font-medium">
            Status
          </label>
          <Select
            name="status"
            defaultValue={filters.status}
            items={{
              ALL: "All",
              DRAFT: "Draft",
              SENT: "Sent",
              ACCEPTED: "Accepted",
              CANCELLED: "Cancelled",
              CONVERTED: "Converted",
            }}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="from" className="text-base font-medium">
            From
          </label>
          <DatePicker
            id="from"
            name="from"
            defaultValue={filters.from}
            placeholder="From"
          />
        </div>
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="to" className="text-base font-medium">
            To
          </label>
          <DatePicker
            id="to"
            name="to"
            defaultValue={filters.to}
            placeholder="To"
          />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {hasFilters ? <ListFilterClear href="/app/sales/quotations" /> : null}
      </form>

      {result.total === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No matching quotations" : "No quotations yet"}
          description={
            hasFilters
              ? "Try a different number, customer, status, or date range."
              : "Create a quotation to send pricing with GST to a customer. Stock and accounts stay unchanged."
          }
          action={
            canCreate && !hasFilters ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/sales/quotations/new" />}
              >
                <Plus className="size-5" />
                <span>New quotation</span>
              </Button>
            ) : null
          }
        />
      ) : (
        <QuotationsDataTable
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
