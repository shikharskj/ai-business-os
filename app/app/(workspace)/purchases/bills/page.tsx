import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";

import { BillsDataTable } from "@/components/business/bills-data-table";
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
  PURCHASE_STATUSES,
  listPurchasesPage,
  purchaseSearchSchema,
} from "@/modules/purchases";
import { prismaPurchasesRepository } from "@/modules/purchases/infrastructure/prisma-purchases-repository";
import { businessDate } from "@/modules/shared-kernel/dates";

const STATUS_FILTER_LABELS: Record<(typeof PURCHASE_STATUSES)[number] | "ALL", string> = {
  ALL: "All",
  DRAFT: "Draft",
  POSTED: "Posted",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("purchase:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = purchaseSearchSchema.safeParse({
    q: params.q,
    status: params.status,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", status: "ALL" as const, from: undefined, to: undefined };
  const canCreate = roleHasPermission(tenant.membership.role, "purchase:create");
  const result = await listPurchasesPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    status: filters.status,
    fromDate: filters.from ? businessDate(filters.from) : undefined,
    toDate: filters.to ? businessDate(filters.to) : undefined,
    page,
    pageSize,
    purchases: prismaPurchasesRepository,
  });
  const hasFilters = Boolean(
    filters.q || filters.status !== "ALL" || filters.from || filters.to
  );
  const queryString = toQueryString(params);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Bills"
        description="Supplier purchase bills with GST. Posting increases stock and updates payables."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/purchases/bills/new" />}
            >
              <Plus className="size-5" />
              <span>New bill</span>
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
          <Button type="submit" variant="outline">
            Filter
          </Button>
        }
      />

      {result.total === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? "No matching bills" : "No bills yet"}
          description={
            hasFilters
              ? "Try a different number, supplier, status, or date range."
              : "Create a purchase bill for a supplier. Post when ready to update stock and payables."
          }
          action={
            canCreate && !hasFilters ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/purchases/bills/new" />}
              >
                <Plus className="size-5" />
                <span>New bill</span>
              </Button>
            ) : null
          }
        />
      ) : (
        <BillsDataTable
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
