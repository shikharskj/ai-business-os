import { addMoney, type Money } from "@/modules/shared-kernel/money";
import { ACCOUNT_CODES, type JournalLineDraft } from "@/modules/accounting/domain/types";
import type { Product } from "@/modules/catalog/domain/types";
import type { Purchase } from "@/modules/purchases/domain/types";
import { zeroMoney } from "@/modules/purchases/domain/totals";

/**
 * Purchase posting:
 * Dr Inventory (tracked taxable) / Operating expense (non-tracked taxable)
 * Dr Input GST (total tax when > 0)
 * Cr Accounts Payable (grand total)
 */
export function buildPurchaseJournalLines(
  purchase: Purchase,
  products: Map<string, Product>
): JournalLineDraft[] {
  const currency = purchase.grandTotal.currency;
  const zero = zeroMoney(currency);
  const description = `Purchase ${purchase.number}`;

  let inventoryTaxable = zero;
  let expenseTaxable = zero;

  for (const line of purchase.lines) {
    const product = products.get(line.productId);
    if (product?.tracksInventory) {
      inventoryTaxable = addMoney(inventoryTaxable, line.taxableAmount);
    } else {
      expenseTaxable = addMoney(expenseTaxable, line.taxableAmount);
    }
  }

  const lines: JournalLineDraft[] = [];

  if (inventoryTaxable.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.INVENTORY,
      description,
      debit: inventoryTaxable,
      credit: zero,
    });
  }

  if (expenseTaxable.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.OPERATING_EXPENSE,
      description,
      debit: expenseTaxable,
      credit: zero,
    });
  }

  // Edge case: zero taxable but still a payable (should not happen with positive lines)
  if (
    inventoryTaxable.amountMinor === 0n &&
    expenseTaxable.amountMinor === 0n &&
    purchase.taxableAmount.amountMinor > 0n
  ) {
    lines.push({
      accountCode: ACCOUNT_CODES.OPERATING_EXPENSE,
      description,
      debit: purchase.taxableAmount,
      credit: zero,
    });
  }

  if (purchase.totalTax.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.INPUT_GST,
      description,
      debit: purchase.totalTax,
      credit: zero,
    });
  }

  lines.push({
    accountCode: ACCOUNT_CODES.PAYABLE,
    description,
    debit: zero,
    credit: purchase.grandTotal,
  });

  return lines;
}

export type PurchaseInventoryAmount = {
  productId: string;
  amount: Money;
};
