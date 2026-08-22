import Link from "next/link";
import { notFound } from "next/navigation";

import { MoneyDisplay } from "@/components/business/money-display";
import { StatusBadge } from "@/components/business/status-badge";
import {
  catalogKindPresentation,
  catalogTrackingPresentation,
  stockStatusPresentation,
} from "@/components/business/status-tone";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { CatalogNotFoundError, getProduct } from "@/modules/catalog";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import {
  formatQuantity,
  getStockPosition,
  parseLowStockThreshold,
} from "@/modules/inventory";

function gstRateLabel(bps: number): string {
  return `${bps / 100}%`;
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await authorize("product:read");
  const { id } = await params;
  const query = await searchParams;
  const canUpdate = roleHasPermission(tenant.membership.role, "product:update");

  let product;
  try {
    product = await getProduct({
      tenantId: tenant.tenantId,
      productId: id,
      catalog: prismaCatalogRepository,
    });
  } catch (error) {
    if (error instanceof CatalogNotFoundError) {
      notFound();
    }
    throw error;
  }

  const stock = await getStockPosition({
    tenantId: tenant.tenantId,
    productId: product.id,
    lowStockThreshold: parseLowStockThreshold(tenant.business.lowStockThreshold),
    catalog: prismaCatalogRepository,
    inventory: prismaInventoryRepository,
  });
  const kindBadge = catalogKindPresentation(product.kind);
  const trackingBadge = catalogTrackingPresentation(product.tracksInventory);
  const stockBadge = stockStatusPresentation({
    isLowStock: stock.isLowStock,
    hasMovements: stock.hasMovements,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
      <PageHeader
        title={product.name}
        description="Catalog item"
        actions={
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/inventory/products" />}
            >
              Back
            </Button>
            {canUpdate ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/app/inventory/products/${product.id}/edit`} />}
              >
                Edit
              </Button>
            ) : null}
            {product.tracksInventory ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/app/inventory/stock/${product.id}`} />}
              >
                Stock
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex items-center gap-2">
        <StatusBadge tone={kindBadge.tone}>{kindBadge.label}</StatusBadge>
        <StatusBadge tone={trackingBadge.tone}>{trackingBadge.label}</StatusBadge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {product.tracksInventory && stock.quantity !== null ? (
            <>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatQuantity(stock.quantity)} {product.unitOfMeasurement}
              </p>
              <StatusBadge tone={stockBadge.tone}>{stockBadge.label}</StatusBadge>
              {!stock.hasMovements ? (
                <p className="text-base text-muted-foreground">
                  No stock movements yet
                </p>
              ) : null}
            </>
          ) : product.tracksInventory ? (
            <p className="text-base text-muted-foreground">
              Stock is not tracked for this item.
            </p>
          ) : (
            <p className="text-base text-muted-foreground">
              Stock is not tracked for this item.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-base sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">SKU</p>
            <p className="font-mono text-xs">{product.sku}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Unit</p>
            <p>{product.unitOfMeasurement}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Selling price</p>
            <MoneyDisplay value={product.sellingPrice} />
          </div>
          <div>
            <p className="text-muted-foreground">Purchase price</p>
            <MoneyDisplay value={product.purchasePrice} />
          </div>
          <div>
            <p className="text-muted-foreground">HSN / SAC</p>
            <p className="font-mono text-xs">{product.hsnSac ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">GST rate</p>
            <p>{gstRateLabel(product.taxRateBps)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Category</p>
            <p>{product.category ?? "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
