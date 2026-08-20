import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  clampPage,
  preserveOrderByIds,
  skipForPage,
  type ListPageResult,
  type PageSize,
} from "@/modules/shared-kernel/list-page";
import {
  toQuantityDecimalForPrisma,
  type Quantity,
} from "@/modules/inventory/domain/quantity";

function stockWhereConditions(input: {
  tenantId: string;
  query?: string;
  lowStockOnly?: boolean;
  threshold: Quantity;
  fromDate?: string;
  toDate?: string;
}): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p."tenantId" = ${input.tenantId}`,
    Prisma.sql`p."tracksInventory" = true`,
  ];
  if (input.fromDate) {
    conditions.push(Prisma.sql`p."createdAt" >= ${input.fromDate}::date`);
  }
  if (input.toDate) {
    conditions.push(Prisma.sql`p."createdAt" < (${input.toDate}::date + interval '1 day')`);
  }
  const query = input.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      p.name ILIKE ${pattern}
      OR p.sku ILIKE ${pattern}
      OR COALESCE(p."hsnSac", '') ILIKE ${pattern}
      OR COALESCE(p.category, '') ILIKE ${pattern}
    )`);
  }
  if (input.lowStockOnly) {
    const thresholdDecimal = toQuantityDecimalForPrisma(input.threshold);
    conditions.push(
      Prisma.sql`COALESCE(stock.qty, 0) <= ${thresholdDecimal}`
    );
  }
  return conditions;
}

const stockJoinSql = (tenantId: string) => Prisma.sql`
  LEFT JOIN (
    SELECT im."productId",
      COALESCE(
        SUM(
          CASE
            WHEN im.direction = 'IN' THEN im.quantity
            ELSE -im.quantity
          END
        ),
        0
      ) AS qty
    FROM inventory_movements im
    WHERE im."tenantId" = ${tenantId}
    GROUP BY im."productId"
  ) stock ON stock."productId" = p.id
`;

export async function listStockProductIdsPage(input: {
  client?: Pick<PrismaClient, "$queryRaw">;
  tenantId: string;
  query?: string;
  lowStockOnly?: boolean;
  threshold: Quantity;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: PageSize;
}): Promise<ListPageResult<string>> {
  const client = input.client ?? prisma;
  const whereSql = Prisma.join(stockWhereConditions(input), " AND ");

  const countRows = await client.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM products p
      ${stockJoinSql(input.tenantId)}
      WHERE ${whereSql}
    `
  );
  const total = Number(countRows[0]?.count ?? 0n);
  const page = clampPage(input.page, total, input.pageSize);
  const skip = skipForPage(page, input.pageSize);

  if (total === 0) {
    return { items: [], total: 0, page: 1, pageSize: input.pageSize };
  }

  const idRows = await client.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT p.id
      FROM products p
      LEFT JOIN list_row_orders o
        ON o."tenantId" = ${input.tenantId}
        AND o."listKey" = 'stock'
        AND o."recordId" = p.id
      ${stockJoinSql(input.tenantId)}
      WHERE ${whereSql}
      ORDER BY o."sortOrder" ASC NULLS FIRST, p.name ASC
      LIMIT ${input.pageSize}
      OFFSET ${skip}
    `
  );

  return {
    items: idRows.map((row) => row.id),
    total,
    page,
    pageSize: input.pageSize,
  };
}

export function orderProductsByIds<T extends { id: string }>(
  products: T[],
  ids: string[]
): T[] {
  return preserveOrderByIds(products, ids, (product) => product.id);
}
