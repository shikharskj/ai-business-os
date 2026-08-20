import "server-only";

import {
  buildStockPositionsForProductIds,
} from "@/modules/inventory/application/stock";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/modules/inventory/domain/quantity";
import type { StockPosition } from "@/modules/inventory/domain/types";
import type { Quantity } from "@/modules/inventory/domain/quantity";
import type { CatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import type { InventoryRepository } from "@/modules/inventory/infrastructure/repositories";
import { listStockProductIdsPage } from "@/modules/inventory/infrastructure/prisma-stock-list-repository";
import type { ListPageResult, PageSize } from "@/modules/shared-kernel/list-page";

export async function listStockPositionsPage(input: {
  tenantId: string;
  query?: string;
  lowStockOnly?: boolean;
  lowStockThreshold?: Quantity;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: PageSize;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
}): Promise<ListPageResult<StockPosition>> {
  const threshold = input.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const pageResult = await listStockProductIdsPage({
    tenantId: input.tenantId,
    query: input.query,
    lowStockOnly: input.lowStockOnly,
    threshold,
    fromDate: input.fromDate,
    toDate: input.toDate,
    page: input.page,
    pageSize: input.pageSize,
  });

  if (pageResult.items.length === 0) {
    return { ...pageResult, items: [] };
  }

  const items = await buildStockPositionsForProductIds({
    tenantId: input.tenantId,
    productIds: pageResult.items,
    lowStockThreshold: threshold,
    catalog: input.catalog,
    inventory: input.inventory,
  });

  return {
    ...pageResult,
    items,
  };
}
