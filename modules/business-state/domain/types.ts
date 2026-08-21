import type { Money } from "@/modules/shared-kernel/money";
import type { BusinessDate } from "@/modules/shared-kernel/dates";

export const BUSINESS_STATE_SCHEMA_VERSION = 3;

export const SALES_MOMENTUM_WINDOW_DAYS = 30;

export const IDLE_QUOTATION_DAYS = 7;

export const ATTENTION_ITEM_TYPES = [
  "OVERDUE_RECEIVABLE",
  "LOW_STOCK",
  "IDLE_QUOTATION",
] as const;

export type AttentionItemType = (typeof ATTENTION_ITEM_TYPES)[number];

export const ATTENTION_ITEM_STATUSES = ["OPEN", "DISMISSED"] as const;

export type AttentionItemStatus = (typeof ATTENTION_ITEM_STATUSES)[number];

export const AUTOMATION_OUTCOME_KINDS = [
  "ATTENTION_DISMISSED",
  "REMINDER_PROPOSED",
  "REMINDER_SENT",
  "PAID_AFTER_REMINDER",
] as const;

export type AutomationOutcomeKind = (typeof AUTOMATION_OUTCOME_KINDS)[number];

export const ATTENTION_SEVERITY = {
  OVERDUE_RECEIVABLE_BASE: 80,
  OVERDUE_RECEIVABLE_DAY_CAP: 19,
  LOW_STOCK: 50,
  IDLE_QUOTATION: 30,
} as const;

export type ReceivablesRiskSnapshot = {
  tenantId: string;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  totalOutstanding: Money;
  overdueOutstanding: Money;
  currency: string;
  computedAt: Date;
};

export type InventoryRiskSnapshot = {
  tenantId: string;
  lowStockCount: number;
  thresholdMajor: string;
  computedAt: Date;
};

export type SalesMomentumSnapshot = {
  tenantId: string;
  windowDays: number;
  windowFrom: BusinessDate;
  windowTo: BusinessDate;
  postedInvoiceCount: number;
  salesTotal: Money;
  taxableTotal: Money;
  currency: string;
  computedAt: Date;
};

export type CashPositionAccountBalance = {
  accountCode: string;
  accountName: string;
  balance: Money;
  factId: string;
};

/**
 * Ledger cash/bank balances. Never derived from unpaid invoices.
 */
export type CashPositionSnapshot = {
  tenantId: string;
  cashBalance: Money;
  bankBalance: Money;
  total: Money;
  currency: string;
  scale: number;
  accounts: CashPositionAccountBalance[];
  computedAt: Date;
};

export type BusinessStateMetaSnapshot = {
  tenantId: string;
  schemaVersion: number;
  rebuiltAt: Date | null;
  updatedAt: Date;
};

export type AttentionItem = {
  id: string;
  tenantId: string;
  naturalKey: string;
  type: AttentionItemType;
  severity: number;
  status: AttentionItemStatus;
  title: string;
  body: string;
  href: string;
  resourceType: string;
  resourceId: string;
  amount: Money | null;
  currency: string | null;
  factId: string | null;
  computedAt: Date;
  dismissedAt: Date | null;
  dismissedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AttentionItemDraft = {
  naturalKey: string;
  type: AttentionItemType;
  severity: number;
  title: string;
  body: string;
  href: string;
  resourceType: string;
  resourceId: string;
  amount: Money | null;
  currency: string | null;
  factId: string | null;
};

export type AutomationOutcome = {
  id: string;
  tenantId: string;
  kind: AutomationOutcomeKind;
  attentionItemId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  recordedAt: Date;
};

export type BusinessStateSummary = {
  meta: BusinessStateMetaSnapshot | null;
  receivablesRisk: ReceivablesRiskSnapshot | null;
  inventoryRisk: InventoryRiskSnapshot | null;
  salesMomentum: SalesMomentumSnapshot | null;
  cashPosition: CashPositionSnapshot | null;
  attention: {
    openCount: number;
  };
};

export type ProjectionFamily =
  | "receivablesRisk"
  | "inventoryRisk"
  | "salesMomentum"
  | "cashPosition"
  | "attentionQueue"
  | "all";
