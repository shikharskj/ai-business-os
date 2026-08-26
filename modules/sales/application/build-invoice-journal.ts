import { addMoney, type Money } from "@/modules/shared-kernel/money";
import { ACCOUNT_CODES, type JournalLineDraft } from "@/modules/accounting/domain/types";
import type { Product } from "@/modules/catalog/domain/types";
import { moneyTimesQuantity } from "@/modules/sales/domain/pricing";
import type { SalesInvoice } from "@/modules/sales/domain/types";
import { zeroMoney } from "@/modules/sales/domain/totals";

export type InvoiceCogsLine = {
  productId: string;
  amount: Money;
};

export type InvoiceLineUnitCost = {
  lineId: string;
  unitCost: Money;
};

/**
 * Resolve COGS unit costs at invoice post: prefer already-stored line.unitCost,
 * otherwise snapshot product.purchasePrice for tracked inventory lines.
 */
export function resolveInvoiceLineUnitCosts(
  invoice: SalesInvoice,
  products: Map<string, Product>
): InvoiceLineUnitCost[] {
  const costs: InvoiceLineUnitCost[] = [];
  for (const line of invoice.lines) {
    const product = products.get(line.productId);
    if (!product?.tracksInventory) {
      continue;
    }
    costs.push({
      lineId: line.id,
      unitCost: line.unitCost ?? product.purchasePrice,
    });
  }
  return costs;
}

export function computeInvoiceCogsLines(
  invoice: SalesInvoice,
  products: Map<string, Product>,
  unitCosts?: InvoiceLineUnitCost[]
): InvoiceCogsLine[] {
  const costByLine = new Map((unitCosts ?? []).map((c) => [c.lineId, c.unitCost]));
  const lines: InvoiceCogsLine[] = [];
  for (const line of invoice.lines) {
    const product = products.get(line.productId);
    if (!product?.tracksInventory) {
      continue;
    }
    const unitCost =
      costByLine.get(line.id) ?? line.unitCost ?? product.purchasePrice;
    lines.push({
      productId: line.productId,
      amount: moneyTimesQuantity(unitCost, line.quantity),
    });
  }
  return lines;
}

export function buildSalesInvoiceJournalLines(
  invoice: SalesInvoice,
  cogsLines: InvoiceCogsLine[]
): JournalLineDraft[] {
  const currency = invoice.grandTotal.currency;
  const zero = zeroMoney(currency);
  const lines: JournalLineDraft[] = [
    {
      accountCode: ACCOUNT_CODES.RECEIVABLE,
      description: `Invoice ${invoice.number}`,
      debit: invoice.grandTotal,
      credit: zero,
    },
    {
      accountCode: ACCOUNT_CODES.SALES,
      description: `Invoice ${invoice.number}`,
      debit: zero,
      credit: invoice.taxableAmount,
    },
  ];

  if (invoice.totalTax.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.OUTPUT_GST,
      description: `Invoice ${invoice.number}`,
      debit: zero,
      credit: invoice.totalTax,
    });
  }

  const totalCogs = cogsLines.reduce(
    (sum, entry) => addMoney(sum, entry.amount),
    zero
  );
  if (totalCogs.amountMinor > 0n) {
    lines.push({
      accountCode: ACCOUNT_CODES.COGS,
      description: `Invoice ${invoice.number}`,
      debit: totalCogs,
      credit: zero,
    });
    lines.push({
      accountCode: ACCOUNT_CODES.INVENTORY,
      description: `Invoice ${invoice.number}`,
      debit: zero,
      credit: totalCogs,
    });
  }

  return lines;
}
