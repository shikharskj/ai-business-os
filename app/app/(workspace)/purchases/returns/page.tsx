import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";

import { PurchaseReturnsDataTable } from "@/components/business/purchase-returns-data-table";
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
import {
  PURCHASE_RETURN_STATUSES,
  listPurchaseReturnsPage,
  purchaseReturnSearchSchema,
} from "@/modules/purchases";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { businessDate } from "@/modules/shared-kernel/dates";

const STATUS_FILTER_LABELS: Record<
  (typeof PURCHASE_RETURN_STATUSES)[number] | "ALL",
  string
> = {
  ALL: "All",
  DRAFT: "Draft",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
};

export default async function PurchaseReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    purchaseId?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("purchase:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = purchaseReturnSearchSchema.safeParse({
    q: params.q,
    status: params.status,
    purchaseId: params.purchaseId,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : {
        q: "",
        status: "ALL" as const,
        purchaseId: undefined,
        from: undefined,
        to: undefined,
      };
  const canCreate = roleHasPermission(tenant.membership.role, "purchase:create");
  const result = await listPurchaseReturnsPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    status: filters.status,
    purchaseId: filters.purchaseId,
    fromDate: filters.from ? businessDate(filters.from) : undefined,
    toDate: filters.to ? businessDate(filters.to) : undefined,
    page,
    pageSize,
    purchases: prismaPurchasesRepository,
  });
  const hasFilters = Boolean(
    filters.q ||
      filters.status !== "ALL" ||
      filters.purchaseId ||
      filters.from ||
      filters.to
  );
  const queryString = toQueryString(params);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Returns"
        description="Return posted purchase bills without changing them. Posting updates payables, GST, and stock."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/purchases/returns/new" />}
            >
              <Plus className="size-5" />
              <span>New return</span>
            </Button>
          ) : null
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        {pageSize !== 10 ? (
          <input type="hidden" name="pageSize" value={pageSize} />
        ) : null}
        {filters.purchaseId ? (
          <input type="hidden" name="purchaseId" value={filters.purchaseId} />
        ) : null}
        <div className="flex min-w-56 flex-1 flex-col gap-2">
          <label htmlFor="q" className="text-base font-medium">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="Number, supplier, or bill..."
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
        {hasFilters ? <ListFilterClear href="/app/purchases/returns" /> : null}
      </form>

      {result.total === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No matching returns" : "No purchase returns yet"}
          description={
            hasFilters
              ? "Try a different number, supplier, status, or date range."
              : "Issue a return against a posted bill to correct GST, stock, or amounts."
          }
          action={
            canCreate && !hasFilters ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/purchases/returns/new" />}
              >
                <Plus className="size-5" />
                <span>New return</span>
              </Button>
            ) : null
          }
        />
      ) : (
        <PurchaseReturnsDataTable
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
