import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import type { ListKey } from "@/modules/list-order/domain/types";

const RANK_STEP = 1000;

export type ListOrderRepository = {
  savePageOrder(input: {
    tenantId: string;
    listKey: ListKey;
    orderedIds: string[];
    movedId: string;
    newIndex: number;
    page: number;
    pageSize: number;
  }): Promise<void>;
};

export function createPrismaListOrderRepository(
  client: Pick<PrismaClient, "listRowOrder" | "$transaction">
): ListOrderRepository {
  return {
    async savePageOrder(input) {
      const { tenantId, listKey, orderedIds, movedId, page, pageSize } = input;
      if (!orderedIds.includes(movedId)) {
        throw new Error("Moved row is not in the ordered page.");
      }

      const pageOffset = (page - 1) * pageSize;

      await client.$transaction(async (tx) => {
        await rebalancePageRanks({
          client: tx,
          tenantId,
          listKey,
          orderedIds,
          pageOffset,
        });
      });
    },
  };
}

async function rebalancePageRanks(input: {
  client: PrismaClient | Prisma.TransactionClient;
  tenantId: string;
  listKey: ListKey;
  orderedIds: string[];
  pageOffset: number;
}) {
  const operations = input.orderedIds.map((recordId, index) =>
    input.client.listRowOrder.upsert({
      where: {
        tenantId_listKey_recordId: {
          tenantId: input.tenantId,
          listKey: input.listKey,
          recordId,
        },
      },
      create: {
        tenantId: input.tenantId,
        listKey: input.listKey,
        recordId,
        sortOrder: (input.pageOffset + index + 1) * RANK_STEP,
      },
      update: {
        sortOrder: (input.pageOffset + index + 1) * RANK_STEP,
      },
    })
  );
  await input.client.$transaction(operations);
}

export function createMemoryListOrderRepository(): ListOrderRepository & {
  rows: Array<{
    tenantId: string;
    listKey: ListKey;
    recordId: string;
    sortOrder: number;
  }>;
} {
  const rows: Array<{
    tenantId: string;
    listKey: ListKey;
    recordId: string;
    sortOrder: number;
  }> = [];

  const mockClient = {
    listRowOrder: {
      findMany: async ({
        where,
      }: {
        where: {
          tenantId: string;
          listKey: ListKey;
          recordId: { in: string[] };
        };
      }) =>
        rows.filter(
          (row) =>
            row.tenantId === where.tenantId &&
            row.listKey === where.listKey &&
            where.recordId.in.includes(row.recordId)
        ),
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: {
          tenantId_listKey_recordId: {
            tenantId: string;
            listKey: ListKey;
            recordId: string;
          };
        };
        create: {
          tenantId: string;
          listKey: ListKey;
          recordId: string;
          sortOrder: number;
        };
        update: { sortOrder: number };
      }) => {
        const key = where.tenantId_listKey_recordId;
        const existingIndex = rows.findIndex(
          (row) =>
            row.tenantId === key.tenantId &&
            row.listKey === key.listKey &&
            row.recordId === key.recordId
        );
        if (existingIndex >= 0) {
          rows[existingIndex] = {
            ...rows[existingIndex]!,
            sortOrder: update.sortOrder,
          };
          return rows[existingIndex]!;
        }
        const created = { ...create };
        rows.push(created);
        return created;
      },
    },
    $transaction: async (
      fn: (tx: unknown) => Promise<unknown>
    ) => {
      return fn(mockClient);
    },
  };

  return {
    rows,
    async savePageOrder(input) {
      await createPrismaListOrderRepository(mockClient as unknown as PrismaClient).savePageOrder(input);
    },
  };
}
