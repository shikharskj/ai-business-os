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

export type AuditRepository = {
  append(input: AuditInput): Promise<{ id: string }>;
};

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
  };
}

export function createMemoryAuditRepository(): AuditRepository & {
  records: AuditInput[];
} {
  const records: AuditInput[] = [];
  return {
    records,
    async append(input) {
      toPrismaJson(input.metadata ?? {}, "metadata");
      records.push(input);
      return { id: crypto.randomUUID() };
    },
  };
}
