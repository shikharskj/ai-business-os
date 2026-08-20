import type { InventoryMovement } from "@/modules/inventory/domain/types";
import { signedQuantityDelta } from "@/modules/inventory/domain/types";
import {
  addQuantity,
  compareQuantity,
  type Quantity,
  ZERO_QUANTITY,
} from "@/modules/inventory/domain/quantity";

export function quantityFromMovements(movements: InventoryMovement[]): Quantity {
  return movements.reduce(
    (total, movement) =>
      addQuantity(total, signedQuantityDelta(movement.direction, movement.quantity)),
    ZERO_QUANTITY
  );
}

export function isLowStock(
  current: Quantity,
  threshold: Quantity
): boolean {
  return compareQuantity(current, threshold) <= 0;
}
