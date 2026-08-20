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
  };
}

function compareMovements(a: InventoryMovement, b: InventoryMovement): number {
  if (a.occurredOn !== b.occurredOn) {
    return a.occurredOn < b.occurredOn ? -1 : 1;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}
