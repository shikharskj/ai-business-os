import type { CatalogRepository } from "@/modules/catalog";
import {
  listLowStockProducts,
  parseLowStockThreshold,
  toQuantityMajorString,
  type InventoryRepository,
} from "@/modules/inventory";
import { remainingOutstanding } from "@/modules/payments/domain/allocation";
import type { PaymentRepository } from "@/modules/payments";
import {
  RECEIVABLE_INVOICE_STATUSES,
  type SalesRepository,
} from "@/modules/sales";
import type { Quotation } from "@/modules/sales/domain/types";
import {
  attentionFactId,
  idleQuotationNaturalKey,
  lowStockNaturalKey,
  overdueReceivableNaturalKey,
} from "@/modules/business-state/domain/attention-keys";
import {
  ATTENTION_SEVERITY,
  IDLE_QUOTATION_DAYS,
  type AttentionItemDraft,
} from "@/modules/business-state/domain/types";
import {
  todayInTimezone,
  type BusinessDate,
} from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";

export type ComputeAttentionQueueInput = {
  tenantId: string;
  timezone: string;
  currency: string;
  lowStockThresholdMajor: string;
  idleQuotationDays?: number;
  sales: SalesRepository;
  payments: PaymentRepository;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
};

function daysBetween(fromDate: BusinessDate, toDate: BusinessDate): number {
  const from = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDate}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

function moneyLabel(amountMajor: string, currency: string): string {
  return currency === "INR" ? `₹${amountMajor}` : `${currency} ${amountMajor}`;
}

function overdueSeverity(daysOverdue: number): number {
  const extra = Math.min(
    Math.max(daysOverdue, 0),
    ATTENTION_SEVERITY.OVERDUE_RECEIVABLE_DAY_CAP
  );
  return ATTENTION_SEVERITY.OVERDUE_RECEIVABLE_BASE + extra;
}

/**
 * Builds current AttentionQueue drafts from domain truth (overdue invoices,
 * low stock, idle SENT/ACCEPTED quotations). Does not invent money.
 */
export async function computeAttentionQueue(
  input: ComputeAttentionQueueInput
): Promise<AttentionItemDraft[]> {
  const today = todayInTimezone(input.timezone);
  const idleDays = input.idleQuotationDays ?? IDLE_QUOTATION_DAYS;
  const drafts: AttentionItemDraft[] = [];

  drafts.push(
    ...(await computeOverdueReceivableItems({
      tenantId: input.tenantId,
      currency: input.currency,
      today,
      sales: input.sales,
      payments: input.payments,
    }))
  );

  drafts.push(
    ...(await computeLowStockItems({
      tenantId: input.tenantId,
      lowStockThresholdMajor: input.lowStockThresholdMajor,
      catalog: input.catalog,
      inventory: input.inventory,
    }))
  );

  drafts.push(
    ...(await computeIdleQuotationItems({
      tenantId: input.tenantId,
      today,
      idleDays,
      sales: input.sales,
    }))
  );

  return drafts.sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return a.naturalKey.localeCompare(b.naturalKey);
  });
}

async function computeOverdueReceivableItems(input: {
  tenantId: string;
  currency: string;
  today: BusinessDate;
  sales: SalesRepository;
  payments: PaymentRepository;
}): Promise<AttentionItemDraft[]> {
  const invoices = await input.sales.listInvoices({
    tenantId: input.tenantId,
    statuses: RECEIVABLE_INVOICE_STATUSES,
  });
  const scoped = invoices.filter((row) => row.tenantId === input.tenantId);
  const allocated = await input.payments.allocatedTotalsForInvoices(
    input.tenantId,
    scoped.map((row) => row.id)
  );

  const drafts: AttentionItemDraft[] = [];

  for (const invoice of scoped) {
    if (invoice.tenantId !== input.tenantId) continue;
    if (!invoice.dueOn || invoice.dueOn >= input.today) continue;
    const paid =
      allocated.get(invoice.id) ?? money(0n, invoice.grandTotal.currency);
    const outstanding = remainingOutstanding(invoice.grandTotal, paid);
    if (outstanding.amountMinor <= 0n) continue;

    const daysOverdue = daysBetween(invoice.dueOn, input.today);
    const amountMajor = toMajorString(outstanding);
    drafts.push({
      naturalKey: overdueReceivableNaturalKey(invoice.id),
      type: "OVERDUE_RECEIVABLE",
      severity: overdueSeverity(daysOverdue),
      title: `${invoice.customerName} — invoice ${invoice.number} overdue`,
      body: `${invoice.number} was due on ${invoice.dueOn} (${daysOverdue} day${
        daysOverdue === 1 ? "" : "s"
      } overdue). Outstanding ${moneyLabel(amountMajor, outstanding.currency)}.`,
      href: `/app/sales/invoices/${invoice.id}`,
      resourceType: "SalesInvoice",
      resourceId: invoice.id,
      amount: outstanding,
      currency: outstanding.currency,
      factId: attentionFactId("OVERDUE_RECEIVABLE", invoice.id),
    });
  }

  return drafts;
}

async function computeLowStockItems(input: {
  tenantId: string;
  lowStockThresholdMajor: string;
  catalog: CatalogRepository;
  inventory: InventoryRepository;
}): Promise<AttentionItemDraft[]> {
  const threshold = parseLowStockThreshold(input.lowStockThresholdMajor);
  const lowStock = await listLowStockProducts({
    tenantId: input.tenantId,
    lowStockThreshold: threshold,
    catalog: input.catalog,
    inventory: input.inventory,
  });

  return lowStock
    .filter((row) => row.tenantId === input.tenantId && row.isLowStock)
    .map((row) => {
      const quantityMajor = row.quantity
        ? toQuantityMajorString(row.quantity)
        : "0";
      return {
        naturalKey: lowStockNaturalKey(row.productId),
        type: "LOW_STOCK" as const,
        severity: ATTENTION_SEVERITY.LOW_STOCK,
        title: `${row.productName} is low on stock`,
        body: `${row.productName} (${row.sku}) is at ${quantityMajor} ${row.unitOfMeasurement}.`,
        href: `/app/inventory/stock/${row.productId}`,
        resourceType: "Product",
        resourceId: row.productId,
        amount: null,
        currency: null,
        factId: null,
      };
    });
}

async function computeIdleQuotationItems(input: {
  tenantId: string;
  today: BusinessDate;
  idleDays: number;
  sales: SalesRepository;
}): Promise<AttentionItemDraft[]> {
  const quotations = await input.sales.listQuotations({
    tenantId: input.tenantId,
    status: "ALL",
  });

  const drafts: AttentionItemDraft[] = [];
  for (const quotation of quotations) {
    if (quotation.tenantId !== input.tenantId) continue;
    if (!isIdleQuotation(quotation, input.today, input.idleDays)) continue;

    const idleFor = daysBetween(quotation.issuedOn, input.today);
    const amountMajor = toMajorString(quotation.grandTotal);
    drafts.push({
      naturalKey: idleQuotationNaturalKey(quotation.id),
      type: "IDLE_QUOTATION",
      severity: ATTENTION_SEVERITY.IDLE_QUOTATION,
      title: `Quotation ${quotation.number} is idle`,
      body: `${quotation.number} for ${quotation.customerName} has been ${quotation.status.toLowerCase()} for ${idleFor} day${
        idleFor === 1 ? "" : "s"
      } without conversion. Value ${moneyLabel(amountMajor, quotation.grandTotal.currency)}.`,
      href: `/app/sales/quotations/${quotation.id}`,
      resourceType: "Quotation",
      resourceId: quotation.id,
      amount: quotation.grandTotal,
      currency: quotation.grandTotal.currency,
      factId: attentionFactId("IDLE_QUOTATION", quotation.id),
    });
  }

  return drafts;
}

function isIdleQuotation(
  quotation: Quotation,
  today: BusinessDate,
  idleDays: number
): boolean {
  if (quotation.status !== "SENT" && quotation.status !== "ACCEPTED") {
    return false;
  }
  return daysBetween(quotation.issuedOn, today) >= idleDays;
}
