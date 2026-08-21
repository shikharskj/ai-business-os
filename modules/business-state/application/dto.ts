import { toMajorString, type Money } from "@/modules/shared-kernel/money";
import type { BusinessStateSummary } from "@/modules/business-state/domain/types";

function moneyDto(value: Money) {
  return {
    amount: toMajorString(value),
    currency: value.currency,
  };
}

export function businessStateSummaryToDto(summary: BusinessStateSummary) {
  return {
    meta: summary.meta
      ? {
          schemaVersion: summary.meta.schemaVersion,
          rebuiltAt: summary.meta.rebuiltAt?.toISOString() ?? null,
          updatedAt: summary.meta.updatedAt.toISOString(),
        }
      : null,
    receivablesRisk: summary.receivablesRisk
      ? {
          openInvoiceCount: summary.receivablesRisk.openInvoiceCount,
          overdueInvoiceCount: summary.receivablesRisk.overdueInvoiceCount,
          totalOutstanding: moneyDto(summary.receivablesRisk.totalOutstanding),
          overdueOutstanding: moneyDto(
            summary.receivablesRisk.overdueOutstanding
          ),
          computedAt: summary.receivablesRisk.computedAt.toISOString(),
        }
      : null,
    inventoryRisk: summary.inventoryRisk
      ? {
          lowStockCount: summary.inventoryRisk.lowStockCount,
          thresholdMajor: summary.inventoryRisk.thresholdMajor,
          computedAt: summary.inventoryRisk.computedAt.toISOString(),
        }
      : null,
    salesMomentum: summary.salesMomentum
      ? {
          windowDays: summary.salesMomentum.windowDays,
          windowFrom: summary.salesMomentum.windowFrom,
          windowTo: summary.salesMomentum.windowTo,
          postedInvoiceCount: summary.salesMomentum.postedInvoiceCount,
          salesTotal: moneyDto(summary.salesMomentum.salesTotal),
          taxableTotal: moneyDto(summary.salesMomentum.taxableTotal),
          computedAt: summary.salesMomentum.computedAt.toISOString(),
        }
      : null,
  };
}
