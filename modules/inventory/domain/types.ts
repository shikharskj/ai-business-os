import type { BusinessDate } from "@/modules/shared-kernel/dates";
import {
  negateQuantity,
  type Quantity,
} from "@/modules/inventory/domain/quantity";

export const INVENTORY_MOVEMENT_CAUSES = [
  "OPENING",
  "ADJUSTMENT",
  "SALE",
  "PURCHASE",
  "RETURN",
] as const;

export type InventoryMovementCause = (typeof INVENTORY_MOVEMENT_CAUSES)[number];

export const INVENTORY_MOVEMENT_DIRECTIONS = ["IN", "OUT"] as const;

export type InventoryMovementDirection =
  (typeof INVENTORY_MOVEMENT_DIRECTIONS)[number];

export type InventoryMovement = {
  id: string;
  tenantId: string;
  productId: string;
  cause: InventoryMovementCause;
  direction: InventoryMovementDirection;
  quantity: Quantity;
  occurredOn: BusinessDate;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  reason: string | null;
  actorUserId: string;
  createdAt: Date;
};

export type StockPosition = {
  tenantId: string;
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasurement: string;
  tracksInventory: boolean;
  quantity: Quantity | null;
  hasMovements: boolean;
  isLowStock: boolean;
};

export type RecordInventoryMovementInput = {
  productId: string;
  cause: InventoryMovementCause;
  direction: InventoryMovementDirection;
  quantity: Quantity;
  occurredOn: BusinessDate;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  reason?: string | null;
};

export function signedQuantityDelta(
  direction: InventoryMovementDirection,
  qty: Quantity
): Quantity {
  return direction === "IN" ? qty : negateQuantity(qty);
}
