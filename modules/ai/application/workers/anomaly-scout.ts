import type {
  Anomaly,
  AnomalyBundle,
  FactsBundle,
} from "@/modules/ai/domain/supervisor-types";
import { formatINR } from "@/modules/shared-kernel/format-money";

/**
 * Anomaly Scout — proactive attention items from authoritative overview alerts + thresholds.
 */
export function runAnomalyScout(facts: FactsBundle): AnomalyBundle {
  const anomalies: Anomaly[] = [];
  const { overview } = facts;

  if (overview.overdueInvoiceCount > 0) {
    anomalies.push({
      id: "anomaly.overdue",
      severity: "danger",
      kind: "fact",
      title: `${overview.overdueInvoiceCount} overdue invoice${overview.overdueInvoiceCount === 1 ? "" : "s"}`,
      detail: `${formatINR(overview.overdueOutstanding)} past due. Follow up to protect cash flow.`,
      href: "/app/sales/invoices",
      relatedFactIds: ["fact.overdueCount", "fact.overdueOutstanding"],
    });
  }

  if (overview.lowStockCount > 0) {
    anomalies.push({
      id: "anomaly.low-stock",
      severity: "warning",
      kind: "fact",
      title: `${overview.lowStockCount} product${overview.lowStockCount === 1 ? "" : "s"} low on stock`,
      detail: "Inventory is at or below the business low-stock threshold.",
      href: "/app/inventory/stock?lowStock=1",
      relatedFactIds: ["fact.lowStockCount"],
    });
  }

  for (const alert of overview.alerts) {
    if (alert.kind === "OVERDUE_INVOICE" && overview.overdueInvoiceCount > 3) {
      continue;
    }
    anomalies.push({
      id: `anomaly.alert.${alert.kind}.${alert.href}`,
      severity: alert.kind === "OVERDUE_INVOICE" ? "danger" : "warning",
      kind: "fact",
      title: alert.title,
      detail: alert.detail,
      href: alert.href,
      relatedFactIds: [`fact.alert.${alert.kind}.${alert.href}`],
    });
  }

  if (overview.payables.amountMinor > overview.receivables.amountMinor * 2n && overview.payables.amountMinor > 0n) {
    anomalies.push({
      id: "anomaly.payables-heavy",
      severity: "info",
      kind: "recommendation",
      title: "Payables outweigh receivables",
      detail: `Supplier balances (${formatINR(overview.payables)}) are high relative to receivables (${formatINR(overview.receivables)}).`,
      href: "/app/purchases/bills",
      relatedFactIds: ["fact.payables", "fact.receivables"],
    });
  }

  // Dedupe by id
  const seen = new Set<string>();
  return {
    anomalies: anomalies.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    }),
  };
}
