import type { Money } from "@/modules/shared-kernel/money";
import { MoneyDisplay } from "@/components/business/money-display";
import type { GstSupplyType } from "@/modules/tax/domain/types";

export function GstBreakdown({
  taxableAmount,
  cgst,
  sgst,
  igst,
  totalTax,
  grandTotal,
  supplyType,
}: {
  taxableAmount: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  totalTax: Money;
  grandTotal: Money;
  supplyType: GstSupplyType | "MIXED";
}) {
  const supplyLabel =
    supplyType === "INTRA_STATE"
      ? "Intra-state (CGST + SGST)"
      : supplyType === "INTER_STATE"
        ? "Inter-state (IGST)"
        : supplyType === "MIXED"
          ? "Mixed supply types"
          : "No GST charged";

  return (
    <div className="flex flex-col gap-2 text-base">
      <p className="text-xs text-muted-foreground">{supplyLabel}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Taxable</span>
        <MoneyDisplay value={taxableAmount} />
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">CGST</span>
        <MoneyDisplay value={cgst} />
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">SGST</span>
        <MoneyDisplay value={sgst} />
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">IGST</span>
        <MoneyDisplay value={igst} />
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Total tax</span>
        <MoneyDisplay value={totalTax} />
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-2 font-medium">
        <span>Grand total</span>
        <MoneyDisplay value={grandTotal} />
      </div>
    </div>
  );
}
