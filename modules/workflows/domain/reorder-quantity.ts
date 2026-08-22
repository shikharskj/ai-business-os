import type { InventoryMovement } from "@/modules/inventory/domain/types";
import {
  addQuantity,
  compareQuantity,
  quantity,
  QUANTITY_SCALE_FACTOR,
  subtractQuantity,
  ZERO_QUANTITY,
  type Quantity,
} from "@/modules/inventory/domain/quantity";
import { addBusinessDays, type BusinessDate } from "@/modules/shared-kernel/dates";

/** Days of cover the velocity stub aims for. Not Guardian forecasting. */
export const REORDER_COVER_DAYS = 14;

export function saleOutflowInWindow(input: {
  movements: readonly InventoryMovement[];
  tenantId: string;
  productId: string;
  windowFrom: BusinessDate;
  windowTo: BusinessDate;
}): Quantity {
  let total = ZERO_QUANTITY;
  for (const movement of input.movements) {
    if (movement.tenantId !== input.tenantId) continue;
    if (movement.productId !== input.productId) continue;
    if (movement.cause !== "SALE" || movement.direction !== "OUT") continue;
    if (movement.occurredOn < input.windowFrom || movement.occurredOn > input.windowTo) {
      continue;
    }
    total = addQuantity(total, movement.quantity);
  }
  return total;
}

function maxQuantity(left: Quantity, right: Quantity): Quantity {
  return compareQuantity(left, right) >= 0 ? left : right;
}

/**
 * Prepare-only reorder quantity: cover recent sale velocity for
 * {@link REORDER_COVER_DAYS}, or enough to rise above the low-stock
 * threshold. Never posts a purchase.
 */
export function suggestReorderQuantity(input: {
  current: Quantity;
  threshold: Quantity;
  saleOutflow: Quantity;
  windowDays?: number;
  coverDays?: number;
}): Quantity {
  const one = quantity(QUANTITY_SCALE_FACTOR);
  const windowDays = input.windowDays ?? REORDER_COVER_DAYS;
  const coverDays = input.coverDays ?? REORDER_COVER_DAYS;
  const current =
    compareQuantity(input.current, ZERO_QUANTITY) < 0
      ? ZERO_QUANTITY
      : input.current;

  const avgDailyMinor =
    windowDays > 0 ? input.saleOutflow.amountMinor / BigInt(windowDays) : 0n;
  const coverNeed = quantity(avgDailyMinor * BigInt(coverDays));
  const coverGap =
    compareQuantity(coverNeed, current) > 0
      ? subtractQuantity(coverNeed, current)
      : ZERO_QUANTITY;
  const thresholdGap =
    compareQuantity(input.threshold, current) > 0
      ? subtractQuantity(input.threshold, current)
      : ZERO_QUANTITY;

  return maxQuantity(maxQuantity(coverGap, thresholdGap), one);
}

export function reorderWindowFrom(
  today: BusinessDate,
  coverDays: number = REORDER_COVER_DAYS
): BusinessDate {
  return addBusinessDays(today, -(coverDays - 1));
}
