import { money, type Money } from "@/modules/shared-kernel/money";
import {
  QUANTITY_SCALE_FACTOR,
  type Quantity,
} from "@/modules/inventory/domain/quantity";
import { roundHalfAwayFromZero } from "@/modules/tax/domain/rounding";
import { PurchaseValidationError } from "@/modules/purchases/domain/errors";

export function moneyTimesQuantity(unitPrice: Money, quantity: Quantity): Money {
  const minor = roundHalfAwayFromZero(
    unitPrice.amountMinor * quantity.amountMinor,
    QUANTITY_SCALE_FACTOR
  );
  return money(minor, unitPrice.currency, unitPrice.scale);
}

export function lineTaxableAmount(lineSubtotal: Money, discount: Money): Money {
  if (discount.currency !== lineSubtotal.currency || discount.scale !== lineSubtotal.scale) {
    throw new PurchaseValidationError("Discount currency must match the line amount.");
  }
  if (discount.amountMinor < 0n) {
    throw new PurchaseValidationError("Line discount cannot be negative.");
  }
  if (discount.amountMinor > lineSubtotal.amountMinor) {
    throw new PurchaseValidationError(
      "Line discount cannot be greater than the line amount."
    );
  }
  return money(
    lineSubtotal.amountMinor - discount.amountMinor,
    lineSubtotal.currency,
    lineSubtotal.scale
  );
}

export function proportionMoney(
  amount: Money,
  numerator: Quantity,
  denominator: Quantity
): Money {
  if (denominator.amountMinor === 0n) {
    return money(0n, amount.currency, amount.scale);
  }
  const minor = roundHalfAwayFromZero(
    amount.amountMinor * numerator.amountMinor,
    denominator.amountMinor
  );
  return money(minor, amount.currency, amount.scale);
}
