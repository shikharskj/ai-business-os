import type { PrismaClient } from "@/generated/prisma/client";

import { toPrismaJson } from "@/modules/shared-kernel/json";

export type AuditInput = {
  tenantId: string;
  actorUserId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
};

export type AuditRecordView = {
  id: string;
  action: string;
  actorUserId: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
};

export type ListAuditForResourceInput = {
  tenantId: string;
  resource: string;
  resourceId: string;
  limit?: number;
};

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 1000;

export type AuditRepository = {
  append(input: AuditInput): Promise<{ id: string }>;
  listForResource(input: ListAuditForResourceInput): Promise<AuditRecordView[]>;
};

function metadataFromJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function createPrismaAuditRepository(
  prisma: Pick<PrismaClient, "auditRecord">
): AuditRepository {
  return {
    async append(input) {
      const record = await prisma.auditRecord.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          metadata: toPrismaJson(input.metadata ?? {}, "metadata"),
          correlationId: input.correlationId ?? null,
        },
      });
      return { id: record.id };
    },

    async listForResource(input) {
      let limit = input.limit ?? DEFAULT_LIST_LIMIT;
      if (input.limit !== undefined) {
        if (
          !Number.isSafeInteger(input.limit) ||
          input.limit < 0 ||
          input.limit > MAX_LIST_LIMIT
        ) {
          throw new Error(
            `Invalid limit: must be a non-negative safe integer <= ${MAX_LIST_LIMIT}`
          );
        }
        limit = input.limit;
      }
      const rows = await prisma.auditRecord.findMany({
        where: {
          tenantId: input.tenantId,
          resource: input.resource,
          resourceId: input.resourceId,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        action: row.action,
        actorUserId: row.actorUserId,
        createdAt: row.createdAt,
        metadata: metadataFromJson(row.metadata),
      }));
    },
  };
}

type MemoryAuditRecord = AuditInput & { id: string; createdAt: Date };

export function createMemoryAuditRepository(): AuditRepository & {
  records: MemoryAuditRecord[];
} {
  const records: MemoryAuditRecord[] = [];
  return {
    records,
    async append(input) {
      toPrismaJson(input.metadata ?? {}, "metadata");
      const id = crypto.randomUUID();
      records.push({
        ...input,
        id,
        createdAt: new Date(),
      });
      return { id };
    },

    async listForResource(input) {
      let limit = input.limit ?? DEFAULT_LIST_LIMIT;
      if (input.limit !== undefined) {
        if (
          !Number.isSafeInteger(input.limit) ||
          input.limit < 0 ||
          input.limit > MAX_LIST_LIMIT
        ) {
          throw new Error(
            `Invalid limit: must be a non-negative safe integer <= ${MAX_LIST_LIMIT}`
          );
        }
        limit = input.limit;
      }
      return records
        .map((row, index) => ({ row, index }))
        .filter(
          ({ row }) =>
            row.tenantId === input.tenantId &&
            row.resource === input.resource &&
            row.resourceId === input.resourceId
        )
        .sort((a, b) => {
          const byTime =
            b.row.createdAt.getTime() - a.row.createdAt.getTime();
          return byTime !== 0 ? byTime : b.index - a.index;
        })
        .slice(0, limit)
        .map(({ row }) => ({
          id: row.id,
          action: row.action,
          actorUserId: row.actorUserId,
          createdAt: row.createdAt,
          metadata: row.metadata ?? {},
        }));
    },
  };
}
