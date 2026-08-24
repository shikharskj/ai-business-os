import { addMoney, type Money } from "@/modules/shared-kernel/money";
import { ACCOUNT_CODES, type JournalLineDraft } from "@/modules/accounting/domain/types";
import type { Product } from "@/modules/catalog/domain/types";
import { moneyTimesQuantity } from "@/modules/sales/domain/pricing";
import type { CreditNote } from "@/modules/sales/domain/types";
import { zeroMoney } from "@/modules/sales/domain/totals";
import type { InvoiceCogsLine } from "@/modules/sales/application/build-invoice-journal";

export function computeCreditNoteCogsLines(
  creditNote: CreditNote,
  products: Map<string, Product>
): InvoiceCogsLine[] {
  const lines: InvoiceCogsLine[] = [];
  for (const line of creditNote.lines) {
    const product = products.get(line.productId);
    if (!product?.tracksInventory) {
      continue;
    }
    lines.push({
      productId: line.productId,
      amount: moneyTimesQuantity(product.purchasePrice, line.quantity),
    });
  }
  return lines;
}

/**
 * Reverse of a sales invoice journal: reduce AR, sales, and output GST.
 * Returned stock reverses COGS (Dr Inventory, Cr COGS).
 */
export function buildCreditNoteJournalLines(
  creditNote: CreditNote,
  cogsLines: InvoiceCogsLine[]
): JournalLineDraft[] {
  const currency = creditNote.grandTotal.currency;
  const zero = zeroMoney(currency);
  const description = `Credit note ${creditNote.number}`;
  const lines: JournalLineDraft[] = [
    {
      accountCode: ACCOUNT_CODES.SALES,
      description,
      debit: creditNote.taxableAmount,
      credit: zero,
    },
  ];

  if (creditNote.totalTax.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.OUTPUT_GST,
      description,
      debit: creditNote.totalTax,
      credit: zero,
    });
  }

  lines.push({
    accountCode: ACCOUNT_CODES.RECEIVABLE,
    description,
    debit: zero,
    credit: creditNote.grandTotal,
  });

  const totalCogs = cogsLines.reduce(
    (sum, entry) => addMoney(sum, entry.amount),
    zero
  );
  if (totalCogs.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.INVENTORY,
      description,
      debit: totalCogs,
      credit: zero,
    });
    lines.push({
      accountCode: ACCOUNT_CODES.COGS,
      description,
      debit: zero,
      credit: totalCogs,
    });
  }

  return lines;
}
