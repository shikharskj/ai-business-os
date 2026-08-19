import type { PrismaClient } from "@/generated/prisma/client";

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
  prisma: PrismaClient
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
          metadata: (input.metadata ?? {}) as object,
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
      records.push(input);
      return { id: crypto.randomUUID() };
    },
  };
}
