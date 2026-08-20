import { Package, Plus, Search } from "lucide-react";
import Link from "next/link";

import { ProductsDataTable } from "@/components/business/products-data-table";
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
import { roleHasPermission } from "@/lib/security/permissions";
import { listProductsPage, productSearchSchema } from "@/modules/catalog";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const tenant = await authorize("product:read");
  const params = await searchParams;
  const { page, pageSize } = parseListTableParams(params);
  const parseResult = productSearchSchema.safeParse({
    q: params.q,
    kind: params.kind,
    from: params.from || undefined,
    to: params.to || undefined,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", kind: "ALL" as const, from: undefined, to: undefined };
  const canCreate = roleHasPermission(tenant.membership.role, "product:create");
  const result = await listProductsPage({
    tenantId: tenant.tenantId,
    query: filters.q,
    kind: filters.kind,
    fromDate: filters.from,
    toDate: filters.to,
    page,
    pageSize,
    catalog: prismaCatalogRepository,
  });
  const hasFilters = Boolean(
    filters.q || filters.kind !== "ALL" || filters.from || filters.to
  );
  const queryString = toQueryString(params);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Products"
        description="Products and services you sell or buy."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/inventory/products/new" />}
            >
              <Plus className="size-5" />
              <span>New product</span>
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
            placeholder="Name, SKU, HSN/SAC, or category..."
            className="max-w-xl"
            leftIcon={<Search className="size-5" />}
          />
        </div>
        <div className="flex w-40 flex-col gap-2">
          <label htmlFor="kind" className="text-base font-medium">
            Type
          </label>
          <Select
            name="kind"
            defaultValue={filters.kind}
            items={{ ALL: "All", PRODUCT: "Products", SERVICE: "Services" }}
          >
            <SelectTrigger id="kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PRODUCT">Products</SelectItem>
              <SelectItem value="SERVICE">Services</SelectItem>
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
          icon={Package}
          title={hasFilters ? "No matching products" : "No products yet"}
          description={
            hasFilters
              ? "Try a different name, SKU, HSN/SAC, category, or date range."
              : "Add your first product or service to start invoicing."
          }
          action={
            canCreate && !hasFilters ? (
              <Button
                nativeButton={false}
                render={<Link href="/app/inventory/products/new" />}
              >
                <Plus className="size-5" />
                <span>New product</span>{" "}
              </Button>
            ) : null
          }
        />
      ) : (
        <ProductsDataTable
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
