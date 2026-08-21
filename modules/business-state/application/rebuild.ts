import type { CatalogRepository } from "@/modules/catalog";
import {
  listLowStockProducts,
  parseLowStockThreshold,
  type InventoryRepository,
} from "@/modules/inventory";
import { remainingOutstanding } from "@/modules/payments/domain/allocation";
import type { PaymentRepository } from "@/modules/payments";
import {
  RECEIVABLE_INVOICE_STATUSES,
  type SalesRepository,
} from "@/modules/sales";
import { GST_SALES_STATUSES } from "@/modules/reporting/domain/gst-types";
import type { BusinessStateProjectionRepository } from "@/modules/business-state/domain/projection-repository";
import {
  BUSINESS_STATE_SCHEMA_VERSION,
  SALES_MOMENTUM_WINDOW_DAYS,
  type InventoryRiskSnapshot,
  type ProjectionFamily,
  type ReceivablesRiskSnapshot,
  type SalesMomentumSnapshot,
} from "@/modules/business-state/domain/types";
import {
  businessDate,
  todayInTimezone,
  type BusinessDate,
} from "@/modules/shared-kernel/dates";
import {
  addMoney,
  money,
  type Money,
} from "@/modules/shared-kernel/money";

export type RebuildBusinessStateDeps = {
  tenantId: string;
  timezone: string;
  lowStockThresholdMajor: string;
  currency?: string;
  sales: SalesRepository;
  payments: PaymentRepository;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
  projections: BusinessStateProjectionRepository;
  families?: ProjectionFamily[];
  /** When true, stamps meta.rebuiltAt (full/backfill rebuild). */
  markRebuilt?: boolean;
};

function zeroMoney(currency: string): Money {
  return money(0n, currency);
}

function addDays(date: BusinessDate, days: number): BusinessDate {
  const cursor = new Date(`${date}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return businessDate(cursor.toISOString().slice(0, 10));
}

export async function computeReceivablesRisk(input: {
  tenantId: string;
  timezone: string;
  currency: string;
  sales: SalesRepository;
  payments: PaymentRepository;
}): Promise<ReceivablesRiskSnapshot> {
  const today = todayInTimezone(input.timezone);
  const invoices = await input.sales.listInvoices({
    tenantId: input.tenantId,
    statuses: RECEIVABLE_INVOICE_STATUSES,
  });
  const scoped = invoices.filter((row) => row.tenantId === input.tenantId);
  const allocated = await input.payments.allocatedTotalsForInvoices(
    input.tenantId,
    scoped.map((row) => row.id)
  );

  let totalOutstanding = zeroMoney(input.currency);
  let overdueOutstanding = zeroMoney(input.currency);
  let openInvoiceCount = 0;
  let overdueInvoiceCount = 0;

  for (const invoice of scoped) {
    const paid = allocated.get(invoice.id) ?? zeroMoney(input.currency);
    const outstanding = remainingOutstanding(invoice.grandTotal, paid);
    if (outstanding.amountMinor <= 0n) continue;
    openInvoiceCount += 1;
    totalOutstanding = addMoney(totalOutstanding, outstanding);
    if (invoice.dueOn && invoice.dueOn < today) {
      overdueInvoiceCount += 1;
      overdueOutstanding = addMoney(overdueOutstanding, outstanding);
    }
  }

  return {
    tenantId: input.tenantId,
    openInvoiceCount,
    overdueInvoiceCount,
    totalOutstanding,
    overdueOutstanding,
    currency: input.currency,
    computedAt: new Date(),
  };
}

export async function computeInventoryRisk(input: {
  tenantId: string;
  lowStockThresholdMajor: string;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
}): Promise<InventoryRiskSnapshot> {
  const threshold = parseLowStockThreshold(input.lowStockThresholdMajor);
  const lowStock = await listLowStockProducts({
    tenantId: input.tenantId,
    lowStockThreshold: threshold,
    catalog: input.catalog,
    inventory: input.inventory,
  });

  return {
    tenantId: input.tenantId,
    lowStockCount: lowStock.length,
    thresholdMajor: input.lowStockThresholdMajor,
    computedAt: new Date(),
  };
}

export async function computeSalesMomentum(input: {
  tenantId: string;
  timezone: string;
  currency: string;
  sales: SalesRepository;
  windowDays?: number;
}): Promise<SalesMomentumSnapshot> {
  const windowDays = input.windowDays ?? SALES_MOMENTUM_WINDOW_DAYS;
  const windowTo = todayInTimezone(input.timezone);
  const windowFrom = addDays(windowTo, -(windowDays - 1));

  const invoices = await input.sales.listInvoices({
    tenantId: input.tenantId,
    statuses: GST_SALES_STATUSES,
    fromDate: windowFrom,
    toDate: windowTo,
  });

  let salesTotal = zeroMoney(input.currency);
  let taxableTotal = zeroMoney(input.currency);
  let postedInvoiceCount = 0;

  for (const invoice of invoices) {
    if (invoice.tenantId !== input.tenantId) continue;
    postedInvoiceCount += 1;
    salesTotal = addMoney(salesTotal, invoice.grandTotal);
    taxableTotal = addMoney(taxableTotal, invoice.taxableAmount);
  }

  return {
    tenantId: input.tenantId,
    windowDays,
    windowFrom,
    windowTo,
    postedInvoiceCount,
    salesTotal,
    taxableTotal,
    currency: input.currency,
    computedAt: new Date(),
  };
}

/**
 * Rebuilds selected projection families from domain truth and upserts them.
 * Idempotent: repeated rebuilds converge to the same snapshot for a tenant.
 */
export async function rebuildBusinessStateProjections(
  input: RebuildBusinessStateDeps
): Promise<{
  receivablesRisk: ReceivablesRiskSnapshot | null;
  inventoryRisk: InventoryRiskSnapshot | null;
  salesMomentum: SalesMomentumSnapshot | null;
}> {
  const families = new Set(
    input.families?.includes("all") || !input.families || input.families.length === 0
      ? (["receivablesRisk", "inventoryRisk", "salesMomentum"] as ProjectionFamily[])
      : input.families
  );
  const currency = input.currency ?? "INR";

  let receivablesRisk: ReceivablesRiskSnapshot | null = null;
  let inventoryRisk: InventoryRiskSnapshot | null = null;
  let salesMomentum: SalesMomentumSnapshot | null = null;

  if (families.has("receivablesRisk")) {
    receivablesRisk = await computeReceivablesRisk({
      tenantId: input.tenantId,
      timezone: input.timezone,
      currency,
      sales: input.sales,
      payments: input.payments,
    });
  }

  if (families.has("inventoryRisk")) {
    inventoryRisk = await computeInventoryRisk({
      tenantId: input.tenantId,
      lowStockThresholdMajor: input.lowStockThresholdMajor,
      catalog: input.catalog,
      inventory: input.inventory,
    });
  }

  if (families.has("salesMomentum")) {
    salesMomentum = await computeSalesMomentum({
      tenantId: input.tenantId,
      timezone: input.timezone,
      currency,
      sales: input.sales,
    });
  }

  await input.projections.commitSnapshots({
    tenantId: input.tenantId,
    schemaVersion: BUSINESS_STATE_SCHEMA_VERSION,
    rebuiltAt: input.markRebuilt ? new Date() : undefined,
    ...(receivablesRisk ? { receivablesRisk } : {}),
    ...(inventoryRisk ? { inventoryRisk } : {}),
    ...(salesMomentum ? { salesMomentum } : {}),
  });

  return { receivablesRisk, inventoryRisk, salesMomentum };
}
