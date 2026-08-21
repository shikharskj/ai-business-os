import type { Money } from "@/modules/shared-kernel/money";
import type { BusinessDate } from "@/modules/shared-kernel/dates";

export const BUSINESS_STATE_SCHEMA_VERSION = 1;

export const SALES_MOMENTUM_WINDOW_DAYS = 30;

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

export type BusinessStateMetaSnapshot = {
  tenantId: string;
  schemaVersion: number;
  rebuiltAt: Date | null;
  updatedAt: Date;
};

export type BusinessStateSummary = {
  meta: BusinessStateMetaSnapshot | null;
  receivablesRisk: ReceivablesRiskSnapshot | null;
  inventoryRisk: InventoryRiskSnapshot | null;
  salesMomentum: SalesMomentumSnapshot | null;
};

export type ProjectionFamily =
  | "receivablesRisk"
  | "inventoryRisk"
  | "salesMomentum"
  | "all";
