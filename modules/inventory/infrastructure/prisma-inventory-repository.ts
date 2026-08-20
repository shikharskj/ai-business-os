import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { businessDate } from "@/modules/shared-kernel/dates";
import type { InventoryMovement } from "@/modules/inventory/domain/types";
import {
  INVENTORY_MOVEMENT_CAUSES,
  INVENTORY_MOVEMENT_DIRECTIONS,
} from "@/modules/inventory/domain/types";
import type { InventoryRepository } from "@/modules/inventory/infrastructure/repositories";
import {
  quantityFromPrismaDecimal,
  toQuantityDecimalForPrisma,
} from "@/modules/inventory/domain/quantity";

function mapMovement(record: {
  id: string;
  tenantId: string;
  productId: string;
  cause: string;
  direction: string;
  quantity: { toString(): string };
  occurredOn: string;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  reason: string | null;
  actorUserId: string;
  createdAt: Date;
}): InventoryMovement {
  if (!isCause(record.cause)) {
    throw new Error("Unknown inventory movement cause.");
  }
  if (!isDirection(record.direction)) {
    throw new Error("Unknown inventory movement direction.");
  }

  return {
    id: record.id,
    tenantId: record.tenantId,
    productId: record.productId,
    cause: record.cause,
    direction: record.direction,
    quantity: quantityFromPrismaDecimal(record.quantity),
    occurredOn: businessDate(record.occurredOn),
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    idempotencyKey: record.idempotencyKey,
    reason: record.reason,
    actorUserId: record.actorUserId,
    createdAt: record.createdAt,
  };
}

function isCause(
  value: string
): value is InventoryMovement["cause"] {
  return (INVENTORY_MOVEMENT_CAUSES as readonly string[]).includes(value);
}

function isDirection(
  value: string
): value is InventoryMovement["direction"] {
  return (INVENTORY_MOVEMENT_DIRECTIONS as readonly string[]).includes(value);
}

function compareMovements(a: InventoryMovement, b: InventoryMovement): number {
  if (a.occurredOn !== b.occurredOn) {
    return a.occurredOn < b.occurredOn ? -1 : 1;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function createPrismaInventoryRepository(
  client: Pick<PrismaClient, "inventoryMovement">
): InventoryRepository {
  return {
    async appendMovement(input) {
      const record = await client.inventoryMovement.create({
        data: {
          tenantId: input.tenantId,
          productId: input.movement.productId,
          cause: input.movement.cause,
          direction: input.movement.direction,
          quantity: toQuantityDecimalForPrisma(input.movement.quantity),
          occurredOn: input.movement.occurredOn,
          sourceType: input.movement.sourceType,
          sourceId: input.movement.sourceId,
          idempotencyKey: input.movement.idempotencyKey,
          reason: input.movement.reason ?? null,
          actorUserId: input.actorUserId,
        },
      });
      return mapMovement(record);
    },
    async findByIdempotencyKey(tenantId, idempotencyKey) {
      const record = await client.inventoryMovement.findFirst({
        where: { tenantId, idempotencyKey },
      });
      return record ? mapMovement(record) : null;
    },
    async findOpeningMovement(tenantId, productId) {
      const record = await client.inventoryMovement.findFirst({
        where: { tenantId, productId, cause: "OPENING" },
      });
      return record ? mapMovement(record) : null;
    },
    async listMovements(tenantId, productId) {
      const records = await client.inventoryMovement.findMany({
        where: { tenantId, productId },
        orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
      });
      return records.map(mapMovement).sort(compareMovements);
    },
    async listMovementsForTenant(tenantId) {
      const records = await client.inventoryMovement.findMany({
        where: { tenantId },
        orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
      });
      return records.map(mapMovement).sort(compareMovements);
    },
  };
}

export const prismaInventoryRepository = createPrismaInventoryRepository(prisma);
