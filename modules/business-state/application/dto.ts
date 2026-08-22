import { toMajorString, type Money } from "@/modules/shared-kernel/money";
import { CASH_POSITION_FACT_IDS } from "@/modules/accounting/domain/cash-accounts";
import type {
  AttentionItem,
  AutomationOutcome,
  BusinessStateSummary,
  CashPositionSnapshot,
} from "@/modules/business-state/domain/types";

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
    cashPosition: summary.cashPosition
      ? cashPositionToDto(summary.cashPosition)
      : null,
    attention: {
      openCount: summary.attention.openCount,
    },
  };
}

function moneyFactDto(value: Money, factId: string) {
  return {
    amount: toMajorString(value),
    currency: value.currency,
    scale: value.scale,
    factId,
  };
}

export function cashPositionToDto(snapshot: CashPositionSnapshot) {
  return {
    total: moneyFactDto(snapshot.total, CASH_POSITION_FACT_IDS.total),
    cash: moneyFactDto(snapshot.cashBalance, CASH_POSITION_FACT_IDS.cash),
    bank: moneyFactDto(snapshot.bankBalance, CASH_POSITION_FACT_IDS.bank),
    currency: snapshot.currency,
    scale: snapshot.scale,
    accounts: snapshot.accounts.map((account) => ({
      accountCode: account.accountCode,
      accountName: account.accountName,
      balance: moneyFactDto(account.balance, account.factId),
    })),
    computedAt: snapshot.computedAt.toISOString(),
  };
}

export function attentionItemToDto(item: AttentionItem) {
  return {
    id: item.id,
    type: item.type,
    severity: item.severity,
    status: item.status,
    title: item.title,
    body: item.body,
    href: item.href,
    resourceType: item.resourceType,
    resourceId: item.resourceId,
    amount: item.amount
      ? {
          amount: toMajorString(item.amount),
          currency: item.amount.currency,
          scale: item.amount.scale,
          factId: item.factId,
        }
      : null,
    computedAt: item.computedAt.toISOString(),
    dismissedAt: item.dismissedAt?.toISOString() ?? null,
  };
}

export type AttentionItemDto = ReturnType<typeof attentionItemToDto>;

export function automationOutcomeToDto(outcome: AutomationOutcome) {
  return {
    id: outcome.id,
    kind: outcome.kind,
    attentionItemId: outcome.attentionItemId,
    resourceType: outcome.resourceType,
    resourceId: outcome.resourceId,
    payload: outcome.payload,
    recordedAt: outcome.recordedAt.toISOString(),
  };
}

export type AutomationOutcomeDto = ReturnType<typeof automationOutcomeToDto>;
