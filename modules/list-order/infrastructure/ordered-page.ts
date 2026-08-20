import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";

import type { ListKey } from "@/modules/list-order/domain/types";
import {
  clampPage,
  preserveOrderByIds,
  skipForPage,
  type ListPageResult,
  type PageSize,
} from "@/modules/shared-kernel/list-page";

type OrderedPageInput<T> = {
  client: Pick<PrismaClient, "$queryRaw">;
  tenantId: string;
  listKey: ListKey;
  fromSql: Prisma.Sql;
  idColumn: Prisma.Sql;
  whereConditions: Prisma.Sql[];
  defaultOrderSql: Prisma.Sql;
  page: number;
  pageSize: PageSize;
  fetchByIds: (ids: string[]) => Promise<T[]>;
  getId: (item: T) => string;
};

function joinConditions(conditions: Prisma.Sql[]): Prisma.Sql {
  if (conditions.length === 0) {
    throw new Error("At least one WHERE condition is required.");
  }
  return Prisma.join(conditions, " AND ");
}

export async function fetchOrderedPage<T>(
  input: OrderedPageInput<T>
): Promise<ListPageResult<T>> {
  const whereSql = joinConditions(input.whereConditions);

  const countRows = await input.client.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM ${input.fromSql}
      WHERE ${whereSql}
    `
  );
  const total = Number(countRows[0]?.count ?? 0n);
  const page = clampPage(input.page, total, input.pageSize);
  const skip = skipForPage(page, input.pageSize);

  if (total === 0) {
    return { items: [], total: 0, page: 1, pageSize: input.pageSize };
  }

  const idRows = await input.client.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT ${input.idColumn} AS id
      FROM ${input.fromSql}
      LEFT JOIN list_row_orders o
        ON o."tenantId" = ${input.tenantId}
        AND o."listKey" = ${input.listKey}
        AND o."recordId" = ${input.idColumn}
      WHERE ${whereSql}
      ORDER BY o."sortOrder" ASC NULLS FIRST, ${input.defaultOrderSql}
      LIMIT ${input.pageSize}
      OFFSET ${skip}
    `
  );

  const ids = idRows.map((row) => row.id);
  if (ids.length === 0) {
    return { items: [], total, page, pageSize: input.pageSize };
  }

  const records = await input.fetchByIds(ids);
  return {
    items: preserveOrderByIds(records, ids, input.getId),
    total,
    page,
    pageSize: input.pageSize,
  };
}
