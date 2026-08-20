import { Boxes, Package, Search } from "lucide-react";
import Link from "next/link";

import { LowStockAlert } from "@/components/business/low-stock-alert";
import { StatusBadge } from "@/components/business/status-badge";
import { stockStatusPresentation } from "@/components/business/status-tone";
import { EmptyState } from "@/components/shell/empty-state";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authorize } from "@/lib/security";
import {
  formatQuantity,
  listStockPositions,
  parseLowStockThreshold,
  stockSearchSchema,
} from "@/modules/inventory";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stock?: string }>;
}) {
  const tenant = await authorize("product:read");
  const params = await searchParams;
  const parseResult = stockSearchSchema.safeParse({
    q: params.q,
    stock: params.stock,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", stock: "ALL" as const };
  const threshold = parseLowStockThreshold(tenant.business.lowStockThreshold);
  const positions = await listStockPositions({
    tenantId: tenant.tenantId,
    query: filters.q,
    lowStockOnly: filters.stock === "LOW",
    lowStockThreshold: threshold,
    catalog: prismaCatalogRepository,
    inventory: prismaInventoryRepository,
  });
  const lowStockCount = positions.filter((position) => position.isLowStock).length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <PageHeader
        title="Stock"
        description="Current quantity for inventory-tracked products. Stock changes only through movements."
      />

      {filters.stock === "ALL" ? <LowStockAlert count={lowStockCount} /> : null}

      <form className="flex flex-wrap items-end gap-3" method="get">
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
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {positions.length === 0 ? (
        <EmptyState
          icon={filters.q || filters.stock === "LOW" ? Boxes : Package}
          title={
            filters.q || filters.stock === "LOW"
              ? "No matching stock"
              : "No inventory-tracked products"
          }
          description={
            filters.q || filters.stock === "LOW"
              ? "Try a different name, SKU, or stock filter."
              : "Turn on inventory tracking when you add a product to start recording stock."
          }
          action={
            !filters.q && filters.stock === "ALL" ? (
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
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Current stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => {
                const stock = stockStatusPresentation({
                  isLowStock: position.isLowStock,
                  hasMovements: position.hasMovements,
                });
                return (
                <TableRow key={position.productId}>
                  <TableCell>
                    <Link
                      href={`/app/inventory/stock/${position.productId}`}
                      className="font-medium hover:underline"
                    >
                      {position.productName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {position.sku}
                  </TableCell>
                  <TableCell>{position.unitOfMeasurement}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {position.quantity !== null
                      ? formatQuantity(position.quantity)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={stock.tone}>{stock.label}</StatusBadge>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
