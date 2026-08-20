import { addMoney, money, type Money } from "@/modules/shared-kernel/money";
import type { GstSupplyType } from "@/modules/tax/domain/types";
import type { PreparedQuotationLine } from "@/modules/sales/domain/types";

export function zeroMoney(currency = "INR"): Money {
  return money(0n, currency, 2);
}

export function aggregateQuotationLines(
  lines: PreparedQuotationLine[],
  currency: string
): {
  subtotal: Money;
  discountTotal: Money;
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType | "MIXED";
} {
  const zero = zeroMoney(currency);
  const totals = lines.reduce(
    (acc, line) => ({
      subtotal: addMoney(acc.subtotal, line.lineSubtotal),
      discountTotal: addMoney(acc.discountTotal, line.discount),
      taxableAmount: addMoney(acc.taxableAmount, line.taxableAmount),
      cgst: addMoney(acc.cgst, line.cgst),
      sgst: addMoney(acc.sgst, line.sgst),
      igst: addMoney(acc.igst, line.igst),
      totalTax: addMoney(acc.totalTax, line.totalTax),
      grandTotal: addMoney(acc.grandTotal, line.lineTotal),
    }),
    {
      subtotal: zero,
      discountTotal: zero,
      taxableAmount: zero,
      cgst: zero,
      sgst: zero,
      igst: zero,
      totalTax: zero,
      grandTotal: zero,
    }
  );

  const supplyTypes = new Set(lines.map((line) => line.supplyType));
  let supplyType: GstSupplyType | "MIXED" = "NONE";
  if (supplyTypes.size === 1) {
    supplyType = lines[0]?.supplyType ?? "NONE";
  } else if (supplyTypes.size > 1) {
    supplyType = "MIXED";
  }

  return { ...totals, supplyType };
}
