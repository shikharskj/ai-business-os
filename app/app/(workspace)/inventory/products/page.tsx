import { Package } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
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
import { roleHasPermission } from "@/lib/security/permissions";
import { MoneyDisplay } from "@/components/business/money-display";
import { listProducts, productSearchSchema } from "@/modules/catalog";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string }>;
}) {
  const tenant = await authorize("product:read");
  const params = await searchParams;
  const parseResult = productSearchSchema.safeParse({
    q: params.q,
    kind: params.kind,
  });
  const filters = parseResult.success
    ? parseResult.data
    : { q: "", kind: "ALL" as const };
  const canCreate = roleHasPermission(tenant.membership.role, "product:create");
  const products = await listProducts({
    tenantId: tenant.tenantId,
    query: filters.q,
    kind: filters.kind,
    catalog: prismaCatalogRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Products"
        description="Products and services you sell or buy."
        actions={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/inventory/products/new" />}
            >
              New product
            </Button>
          ) : null
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex min-w-56 flex-1 flex-col gap-2">
          <label htmlFor="q" className="text-sm font-medium">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={filters.q}
            placeholder="Name, SKU, HSN/SAC, or category"
          />
        </div>
        <div className="flex w-40 flex-col gap-2">
          <label htmlFor="kind" className="text-sm font-medium">
            Type
          </label>
          <Select name="kind" defaultValue={filters.kind}>
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
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={
            filters.q || filters.kind !== "ALL"
              ? "No matching products"
              : "No products yet"
          }
          description={
            filters.q || filters.kind !== "ALL"
              ? "Try a different name, SKU, HSN/SAC, or category."
              : "Add your first product or service to start invoicing."
          }
          action={
            canCreate && !filters.q && filters.kind === "ALL" ? (
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
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Selling price</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link
                      href={`/app/inventory/products/${product.id}`}
                      className="font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.category ? (
                      <p className="text-xs text-muted-foreground">
                        {product.category}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {product.sku}
                  </TableCell>
                  <TableCell>{product.unitOfMeasurement}</TableCell>
                  <TableCell>
                    <MoneyDisplay value={product.sellingPrice} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {product.kind === "SERVICE" ? "Service" : "Product"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
