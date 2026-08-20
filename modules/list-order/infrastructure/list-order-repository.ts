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
  }): Promise<void>;
};

export function createPrismaListOrderRepository(
  client: PrismaClient | Prisma.TransactionClient
): ListOrderRepository {
  return {
    async savePageOrder(input) {
      const { tenantId, listKey, orderedIds, movedId, newIndex } = input;
      if (!orderedIds.includes(movedId)) {
        throw new Error("Moved row is not in the ordered page.");
      }

      const neighborIds = [
        newIndex > 0 ? orderedIds[newIndex - 1] : null,
        newIndex < orderedIds.length - 1 ? orderedIds[newIndex + 1] : null,
      ].filter((id): id is string => id !== null);

      const neighbors = await client.listRowOrder.findMany({
        where: {
          tenantId,
          listKey,
          recordId: { in: neighborIds },
        },
      });
      const rankById = new Map(neighbors.map((row) => [row.recordId, row.sortOrder]));

      const prevRank =
        newIndex > 0 ? rankById.get(orderedIds[newIndex - 1]!) ?? null : null;
      const nextRank =
        newIndex < orderedIds.length - 1
          ? rankById.get(orderedIds[newIndex + 1]!) ?? null
          : null;

      let newRank = computeRank(prevRank, nextRank, orderedIds, newIndex);

      if (needsRebalance(prevRank, nextRank, newRank)) {
        await rebalancePageRanks({
          client,
          tenantId,
          listKey,
          orderedIds,
        });
        const refreshed = await client.listRowOrder.findMany({
          where: {
            tenantId,
            listKey,
            recordId: { in: neighborIds },
          },
        });
        const refreshedRankById = new Map(
          refreshed.map((row) => [row.recordId, row.sortOrder])
        );
        const refreshedPrev =
          newIndex > 0 ? refreshedRankById.get(orderedIds[newIndex - 1]!) ?? null : null;
        const refreshedNext =
          newIndex < orderedIds.length - 1
            ? refreshedRankById.get(orderedIds[newIndex + 1]!) ?? null
            : null;
        newRank = computeRank(refreshedPrev, refreshedNext, orderedIds, newIndex);
      }

      await client.listRowOrder.upsert({
        where: {
          tenantId_listKey_recordId: {
            tenantId,
            listKey,
            recordId: movedId,
          },
        },
        create: {
          tenantId,
          listKey,
          recordId: movedId,
          sortOrder: newRank,
        },
        update: {
          sortOrder: newRank,
        },
      });
    },
  };
}

function computeRank(
  prevRank: number | null,
  nextRank: number | null,
  orderedIds: string[],
  newIndex: number
): number {
  if (prevRank === null && nextRank === null) {
    return (newIndex + 1) * RANK_STEP;
  }
  if (prevRank === null && nextRank !== null) {
    const candidate = nextRank - RANK_STEP;
    return candidate > 0 ? candidate : Math.floor(nextRank / 2);
  }
  if (prevRank !== null && nextRank === null) {
    return prevRank + RANK_STEP;
  }
  if (prevRank !== null && nextRank !== null) {
    if (nextRank - prevRank > 1) {
      return Math.floor((prevRank + nextRank) / 2);
    }
    return prevRank + 1;
  }
  return (newIndex + 1) * RANK_STEP;
}

function needsRebalance(
  prevRank: number | null,
  nextRank: number | null,
  newRank: number
): boolean {
  if (prevRank !== null && nextRank !== null && nextRank - prevRank <= 1) {
    return true;
  }
  if (prevRank !== null && newRank <= prevRank) {
    return true;
  }
  if (nextRank !== null && newRank >= nextRank) {
    return true;
  }
  return false;
}

async function rebalancePageRanks(input: {
  client: PrismaClient | Prisma.TransactionClient;
  tenantId: string;
  listKey: ListKey;
  orderedIds: string[];
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
        sortOrder: (index + 1) * RANK_STEP,
      },
      update: {
        sortOrder: (index + 1) * RANK_STEP,
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

  return {
    rows,
    async savePageOrder(input) {
      await createPrismaListOrderRepository({
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
        $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
      } as unknown as PrismaClient).savePageOrder(input);
    },
  };
}
