import type {
  InventoryMovement,
  RecordInventoryMovementInput,
} from "@/modules/inventory/domain/types";

export type InventoryRepository = {
  appendMovement(input: {
    tenantId: string;
    actorUserId: string;
    movement: RecordInventoryMovementInput;
  }): Promise<InventoryMovement>;
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<InventoryMovement | null>;
  findOpeningMovement(
    tenantId: string,
    productId: string
  ): Promise<InventoryMovement | null>;
  listMovements(
    tenantId: string,
    productId: string
  ): Promise<InventoryMovement[]>;
  listMovementsForTenant(tenantId: string): Promise<InventoryMovement[]>;
  sumQuantitiesByProduct(
    tenantId: string,
    productIds: string[]
  ): Promise<Map<string, { quantity: bigint; hasMovements: boolean }>>;
};

export function createMemoryInventoryRepository(
  initial: InventoryMovement[] = []
): InventoryRepository & { movements: InventoryMovement[] } {
  const movements = [...initial];

  return {
    movements,
    async appendMovement(input) {
      const movement: InventoryMovement = {
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        productId: input.movement.productId,
        cause: input.movement.cause,
        direction: input.movement.direction,
        quantity: input.movement.quantity,
        occurredOn: input.movement.occurredOn,
        sourceType: input.movement.sourceType,
        sourceId: input.movement.sourceId,
        idempotencyKey: input.movement.idempotencyKey,
        reason: input.movement.reason ?? null,
        actorUserId: input.actorUserId,
        createdAt: new Date(),
      };
      movements.push(movement);
      return movement;
    },
    async findByIdempotencyKey(tenantId, idempotencyKey) {
      return (
        movements.find(
          (movement) =>
            movement.tenantId === tenantId &&
            movement.idempotencyKey === idempotencyKey
        ) ?? null
      );
    },
    async findOpeningMovement(tenantId, productId) {
      return (
        movements.find(
          (movement) =>
            movement.tenantId === tenantId &&
            movement.productId === productId &&
            movement.cause === "OPENING"
        ) ?? null
      );
    },
    async listMovements(tenantId, productId) {
      return movements
        .filter(
          (movement) =>
            movement.tenantId === tenantId && movement.productId === productId
        )
        .sort(compareMovements);
    },
    async listMovementsForTenant(tenantId) {
      return movements
        .filter((movement) => movement.tenantId === tenantId)
        .sort(compareMovements);
    },
    async sumQuantitiesByProduct(tenantId, productIds) {
      const result = new Map<string, { quantity: bigint; hasMovements: boolean }>();
      const productSet = new Set(productIds);
      const relevantMovements = movements.filter(
        (m) => m.tenantId === tenantId && productSet.has(m.productId)
      );
      const byProduct = new Map<string, InventoryMovement[]>();
      for (const movement of relevantMovements) {
        const list = byProduct.get(movement.productId) ?? [];
        list.push(movement);
        byProduct.set(movement.productId, list);
      }
      for (const productId of productIds) {
        const productMovements = byProduct.get(productId) ?? [];
        result.set(productId, {
          quantity: sumQuantitiesForProduct(productMovements),
          hasMovements: productMovements.length > 0,
        });
      }
      return result;
    },
  };
}

function compareMovements(a: InventoryMovement, b: InventoryMovement): number {
  if (a.occurredOn !== b.occurredOn) {
    return a.occurredOn < b.occurredOn ? -1 : 1;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}

function sumQuantitiesForProduct(movements: InventoryMovement[]): bigint {
  let total = 0n;
  for (const movement of movements) {
    if (movement.direction === "IN") {
      total += movement.quantity.amountMinor;
    } else {
      total -= movement.quantity.amountMinor;
    }
  }
  return total;
}
