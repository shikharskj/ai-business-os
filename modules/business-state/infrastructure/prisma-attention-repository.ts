import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

import type {
  AttentionQueueRepository,
  DismissAttentionRecordInput,
  ListAutomationOutcomesFilter,
  RecordAutomationOutcomeInput,
  SyncAttentionItemsInput,
} from "@/modules/business-state/domain/attention-repository";
import type {
  AttentionItem,
  AttentionItemStatus,
  AttentionItemType,
  AutomationOutcome,
  AutomationOutcomeKind,
} from "@/modules/business-state/domain/types";
import { toPrismaJson } from "@/modules/shared-kernel/json";
import {
  moneyFromPrismaDecimal,
  toDecimalForPrisma,
} from "@/modules/shared-kernel/money";

type PrismaAttentionClient = Pick<
  PrismaClient,
  "attentionItem" | "automationOutcome" | "$transaction"
>;

const ATTENTION_TYPES = new Set<AttentionItemType>([
  "OVERDUE_RECEIVABLE",
  "LOW_STOCK",
  "IDLE_QUOTATION",
]);

const ATTENTION_STATUSES = new Set<AttentionItemStatus>(["OPEN", "DISMISSED"]);

const OUTCOME_KINDS = new Set<AutomationOutcomeKind>([
  "ATTENTION_DISMISSED",
  "REMINDER_PROPOSED",
  "REMINDER_SENT",
  "PAID_AFTER_REMINDER",
]);

function mapType(value: string): AttentionItemType {
  if (!ATTENTION_TYPES.has(value as AttentionItemType)) {
    throw new Error(`Unknown attention item type: ${value}`);
  }
  return value as AttentionItemType;
}

function mapStatus(value: string): AttentionItemStatus {
  if (!ATTENTION_STATUSES.has(value as AttentionItemStatus)) {
    throw new Error(`Unknown attention item status: ${value}`);
  }
  return value as AttentionItemStatus;
}

function mapKind(value: string): AutomationOutcomeKind {
  if (!OUTCOME_KINDS.has(value as AutomationOutcomeKind)) {
    throw new Error(`Unknown automation outcome kind: ${value}`);
  }
  return value as AutomationOutcomeKind;
}

function payloadRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function mapItem(row: {
  id: string;
  tenantId: string;
  naturalKey: string;
  type: string;
  severity: number;
  status: string;
  title: string;
  body: string;
  href: string;
  resourceType: string;
  resourceId: string;
  amount: { toString(): string } | null;
  currency: string | null;
  factId: string | null;
  computedAt: Date;
  dismissedAt: Date | null;
  dismissedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AttentionItem {
  const currency = row.currency;
  return {
    id: row.id,
    tenantId: row.tenantId,
    naturalKey: row.naturalKey,
    type: mapType(row.type),
    severity: row.severity,
    status: mapStatus(row.status),
    title: row.title,
    body: row.body,
    href: row.href,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    amount:
      row.amount && currency
        ? moneyFromPrismaDecimal(row.amount, currency)
        : null,
    currency,
    factId: row.factId,
    computedAt: row.computedAt,
    dismissedAt: row.dismissedAt,
    dismissedByUserId: row.dismissedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapOutcome(row: {
  id: string;
  tenantId: string;
  kind: string;
  attentionItemId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  payload: unknown;
  idempotencyKey: string;
  recordedAt: Date;
}): AutomationOutcome {
  return {
    id: row.id,
    tenantId: row.tenantId,
    kind: mapKind(row.kind),
    attentionItemId: row.attentionItemId,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    payload: payloadRecord(row.payload),
    idempotencyKey: row.idempotencyKey,
    recordedAt: row.recordedAt,
  };
}

export function createPrismaAttentionQueueRepository(
  prisma: PrismaAttentionClient
): AttentionQueueRepository {
  return {
    async syncItems(input: SyncAttentionItemsInput) {
      await prisma.$transaction(
        async (tx) => {
          const keys = input.items.map((draft) => draft.naturalKey);
          if (keys.length === 0) {
            await tx.attentionItem.deleteMany({
              where: { tenantId: input.tenantId },
            });
            return;
          }

          await tx.attentionItem.deleteMany({
            where: {
              tenantId: input.tenantId,
              naturalKey: { notIn: keys },
            },
          });

          for (const draft of input.items) {
            const values = {
              type: draft.type,
              severity: draft.severity,
              title: draft.title,
              body: draft.body,
              href: draft.href,
              resourceType: draft.resourceType,
              resourceId: draft.resourceId,
              amount: draft.amount ? toDecimalForPrisma(draft.amount) : null,
              currency: draft.currency,
              factId: draft.factId,
              computedAt: input.computedAt,
            };
            await tx.attentionItem.upsert({
              where: {
                tenantId_naturalKey: {
                  tenantId: input.tenantId,
                  naturalKey: draft.naturalKey,
                },
              },
              create: {
                tenantId: input.tenantId,
                naturalKey: draft.naturalKey,
                status: "OPEN",
                ...values,
              },
              update: values,
            });
          }
        },
        { timeout: 60000 }
      );
    },

    async listOpen(tenantId: string) {
      const rows = await prisma.attentionItem.findMany({
        where: { tenantId, status: "OPEN" },
        orderBy: [{ severity: "desc" }, { computedAt: "desc" }],
      });
      return rows.map(mapItem);
    },

    async countOpen(tenantId: string) {
      return prisma.attentionItem.count({
        where: { tenantId, status: "OPEN" },
      });
    },

    async findById(tenantId: string, id: string) {
      const row = await prisma.attentionItem.findFirst({
        where: { tenantId, id },
      });
      return row ? mapItem(row) : null;
    },

    async findByNaturalKey(tenantId: string, naturalKey: string) {
      const row = await prisma.attentionItem.findUnique({
        where: {
          tenantId_naturalKey: { tenantId, naturalKey },
        },
      });
      return row ? mapItem(row) : null;
    },

    async dismiss(input: DismissAttentionRecordInput) {
      const existing = await prisma.attentionItem.findFirst({
        where: { tenantId: input.tenantId, id: input.id },
      });
      if (!existing) return null;
      const previousStatus = mapStatus(existing.status);
      if (previousStatus === "DISMISSED") {
        return { item: mapItem(existing), previousStatus };
      }
      const updated = await prisma.attentionItem.update({
        where: { id: existing.id },
        data: {
          status: "DISMISSED",
          dismissedAt: input.dismissedAt,
          dismissedByUserId: input.dismissedByUserId,
        },
      });
      return { item: mapItem(updated), previousStatus };
    },

    async recordOutcome(input: RecordAutomationOutcomeInput) {
      const existing = await prisma.automationOutcome.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) {
        return { created: false, outcome: mapOutcome(existing) };
      }

      try {
        const created = await prisma.automationOutcome.create({
          data: {
            tenantId: input.tenantId,
            kind: input.kind,
            idempotencyKey: input.idempotencyKey,
            attentionItemId: input.attentionItemId ?? null,
            resourceType: input.resourceType ?? null,
            resourceId: input.resourceId ?? null,
            payload: toPrismaJson(input.payload ?? {}, "payload"),
          },
        });
        return { created: true, outcome: mapOutcome(created) };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "";
        if (code !== "P2002") throw error;
        const raced = await prisma.automationOutcome.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: input.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (!raced) throw error;
        return { created: false, outcome: mapOutcome(raced) };
      }
    },

    async listOutcomes(filter: ListAutomationOutcomesFilter) {
      const rows = await prisma.automationOutcome.findMany({
        where: {
          tenantId: filter.tenantId,
          ...(filter.kind ? { kind: filter.kind } : {}),
          ...(filter.resourceType ? { resourceType: filter.resourceType } : {}),
          ...(filter.resourceIds
            ? { resourceId: { in: filter.resourceIds } }
            : {}),
        },
        orderBy: { recordedAt: "desc" },
      });
      return rows.map(mapOutcome);
    },
  };
}

/** App-default attention queue repo (Prisma bound in infrastructure). */
export const prismaAttentionQueueRepository =
  createPrismaAttentionQueueRepository(prisma);
