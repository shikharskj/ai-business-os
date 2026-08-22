import Link from "next/link";
import { notFound } from "next/navigation";

import { AdjustStockForm } from "@/components/business/adjust-stock-form";
import {
  formatDisplayDate,
  movementCauseLabel,
} from "@/components/business/inventory-labels";
import { LowStockAlert } from "@/components/business/low-stock-alert";
import { OpeningStockForm } from "@/components/business/opening-stock-form";
import { StatusBadge } from "@/components/business/status-badge";
import { stockStatusPresentation } from "@/components/business/status-tone";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { todayInTimezone } from "@/modules/shared-kernel/dates";
import { prismaCatalogRepository } from "@/modules/catalog/infrastructure/prisma-catalog-repository";
import { prismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import {
  formatQuantity,
  getStockPosition,
  InventoryNotTrackedError,
  InventoryProductNotFoundError,
  listStockMovements,
  parseLowStockThreshold,
} from "@/modules/inventory";

export default async function StockDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const tenant = await authorize("product:read");
  const { productId } = await params;
  const query = await searchParams;
  const canAdjust = roleHasPermission(
    tenant.membership.role,
    "inventory:adjust"
  );
  const threshold = parseLowStockThreshold(tenant.business.lowStockThreshold);
  const today = todayInTimezone(tenant.business.timezone);

  let position;
  try {
    position = await getStockPosition({
      tenantId: tenant.tenantId,
      productId,
      lowStockThreshold: threshold,
      catalog: prismaCatalogRepository,
      inventory: prismaInventoryRepository,
    });
  } catch (error) {
    if (
      error instanceof InventoryProductNotFoundError ||
      error instanceof InventoryNotTrackedError
    ) {
      notFound();
    }
    throw error;
  }

  if (!position.tracksInventory || position.quantity === null) {
    notFound();
  }

  const movements = await listStockMovements({
    tenantId: tenant.tenantId,
    productId,
    catalog: prismaCatalogRepository,
    inventory: prismaInventoryRepository,
  });
  const stockBadge = stockStatusPresentation({
    isLowStock: position.isLowStock,
    hasMovements: position.hasMovements,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
      <PageHeader
        title={position.productName}
        description={`SKU ${position.sku}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/app/inventory/stock" />}
            >
              Back
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={`/app/inventory/products/${position.productId}`} />}
            >
              Product
            </Button>
          </div>
        }
      />

      {position.isLowStock ? <LowStockAlert count={1} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Current stock</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {formatQuantity(position.quantity)} {position.unitOfMeasurement}
          </p>
          <StatusBadge tone={stockBadge.tone}>{stockBadge.label}</StatusBadge>
          {!position.hasMovements ? (
            <p className="text-base text-muted-foreground">
              No stock movements yet
            </p>
          ) : null}
        </CardContent>
      </Card>

      {canAdjust && !position.hasMovements ? (
        <Card>
          <CardHeader>
            <CardTitle>Opening stock</CardTitle>
          </CardHeader>
          <CardContent>
            <OpeningStockForm
              productId={position.productId}
              unitOfMeasurement={position.unitOfMeasurement}
              today={today}
            />
          </CardContent>
        </Card>
      ) : null}

      {canAdjust && position.hasMovements ? (
        <Card>
          <CardHeader>
            <CardTitle>Adjust stock</CardTitle>
          </CardHeader>
          <CardContent>
            <AdjustStockForm
              productId={position.productId}
              unitOfMeasurement={position.unitOfMeasurement}
              today={today}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Movement history</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-base text-muted-foreground">
              Opening stock and later sales, purchases, or adjustments will
              appear here.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>{formatDisplayDate(movement.occurredOn)}</TableCell>
                      <TableCell>{movementCauseLabel(movement.cause)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {movement.direction === "IN" ? "+" : "−"}
                        {formatQuantity(movement.quantity)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.reason ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
