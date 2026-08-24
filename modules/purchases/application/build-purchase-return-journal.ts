import { addMoney, type Money } from "@/modules/shared-kernel/money";
import { ACCOUNT_CODES, type JournalLineDraft } from "@/modules/accounting/domain/types";
import type { Product } from "@/modules/catalog/domain/types";
import type { PurchaseReturn } from "@/modules/purchases/domain/types";
import { zeroMoney } from "@/modules/purchases/domain/totals";

/**
 * Reverse of a purchase journal: reduce AP, inventory/expense, and input GST.
 */
export function buildPurchaseReturnJournalLines(
  purchaseReturn: PurchaseReturn,
  products: Map<string, Product>
): JournalLineDraft[] {
  const currency = purchaseReturn.grandTotal.currency;
  const zero = zeroMoney(currency);
  const description = `Purchase return ${purchaseReturn.number}`;

  let inventoryTaxable = zero;
  let expenseTaxable = zero;

  for (const line of purchaseReturn.lines) {
    const product = products.get(line.productId);
    if (product?.tracksInventory) {
      inventoryTaxable = addMoney(inventoryTaxable, line.taxableAmount);
    } else {
      expenseTaxable = addMoney(expenseTaxable, line.taxableAmount);
    }
  }

  const lines: JournalLineDraft[] = [
    {
      accountCode: ACCOUNT_CODES.PAYABLE,
      description,
      debit: purchaseReturn.grandTotal,
      credit: zero,
    },
  ];

  if (inventoryTaxable.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.INVENTORY,
      description,
      debit: zero,
      credit: inventoryTaxable,
    });
  }

  if (expenseTaxable.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.OPERATING_EXPENSE,
      description,
      debit: zero,
      credit: expenseTaxable,
    });
  }

  if (
    inventoryTaxable.amountMinor === 0n &&
    expenseTaxable.amountMinor === 0n &&
    purchaseReturn.taxableAmount.amountMinor > 0n
  ) {
    lines.push({
      accountCode: ACCOUNT_CODES.OPERATING_EXPENSE,
      description,
      debit: zero,
      credit: purchaseReturn.taxableAmount,
    });
  }

  if (purchaseReturn.totalTax.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.INPUT_GST,
      description,
      debit: zero,
      credit: purchaseReturn.totalTax,
    });
  }

  return lines;
}

export type PurchaseReturnInventoryAmount = {
  productId: string;
  amount: Money;
};
