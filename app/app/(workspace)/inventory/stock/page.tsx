import { Boxes, Package, Search } from "lucide-react";
import Link from "next/link";

import { LowStockAlert } from "@/components/business/low-stock-alert";
import { StockDataTable } from "@/components/business/stock-data-table";
import { EmptyState } from "@/components/shell/empty-state";
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
import {
  listStockPositionsPage,
  parseLowStockThreshold,
  stockSearchSchema,
} from "@/modules/inventory";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import type { PageSize } from "@/modules/shared-kernel/list-page";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stock?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("product:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = stockSearchSchema.safeParse({
    q: params.q,
    stock: params.stock,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", stock: "ALL" as const, from: undefined, to: undefined };
  const threshold = parseLowStockThreshold(tenant.business.lowStockThreshold);
  const result = await listStockPositionsPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    lowStockOnly: filters.stock === "LOW",
    lowStockThreshold: threshold,
    fromDate: filters.from,
    toDate: filters.to,
    page,
    pageSize,
    catalog: prismaCatalogRepository,
    inventory: prismaInventoryRepository,
  });
  const lowStockCount =
    filters.stock === "ALL"
      ? (
          await listStockPositionsPage({
            tenantId: tenant.tenantId,
            query: filters.q,
            lowStockOnly: true,
            lowStockThreshold: threshold,
            fromDate: filters.from,
            toDate: filters.to,
            page: 1,
            pageSize: 1 as PageSize,
            catalog: prismaCatalogRepository,
            inventory: prismaInventoryRepository,
          })
        ).total
      : 0;
  const hasFilters = Boolean(
    filters.q || filters.stock === "LOW" || filters.from || filters.to
  );
  const queryString = toQueryString(params);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Stock"
        description="Current quantity for inventory-tracked products. Stock changes only through movements."
      />

      {filters.stock === "ALL" ? <LowStockAlert count={lowStockCount} /> : null}

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
            placeholder="Name or SKU..."
            className="max-w-xl"
            leftIcon={<Search className="size-5" />}
          />
        </div>
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor="stock" className="text-base font-medium">
            Stock
          </label>
          <Select
            name="stock"
            defaultValue={filters.stock}
            items={{ ALL: "All tracked", LOW: "Low stock" }}
          >
            <SelectTrigger id="stock" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All tracked</SelectItem>
              <SelectItem value="LOW">Low stock</SelectItem>
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
      </form>

      {result.total === 0 ? (
        <EmptyState
          icon={hasFilters ? Boxes : Package}
          title={
            hasFilters ? "No matching stock" : "No inventory-tracked products"
          }
          description={
            hasFilters
              ? "Try a different name, SKU, stock filter, or date range."
              : "Turn on inventory tracking when you add a product to start recording stock."
          }
          action={
            !hasFilters ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/inventory/products/new" />}
              >
                New product
              </Button>
            ) : null
          }
        />
      ) : (
        <StockDataTable
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
