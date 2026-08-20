import type { CreateNotificationInput } from "@/modules/notifications/domain/types";
import type { OutboxEventRecord } from "@/modules/notifications/domain/types";

function stringPayload(
  payload: Record<string, unknown>,
  key: string
): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function amountLabel(payload: Record<string, unknown>): string | null {
  const amount = payload.amount;
  if (!amount || typeof amount !== "object") {
    return null;
  }
  const record = amount as Record<string, unknown>;
  if (typeof record.amount === "string" && record.currency === "INR") {
    return `₹${record.amount}`;
  }
  return null;
}

/**
 * Maps a domain outbox event into zero or one in-app notification draft.
 * Low-stock drafts need a stock check by the caller before delivery.
 */
export function draftFromOutboxEvent(
  event: OutboxEventRecord
): CreateNotificationInput | "check_low_stock" | null {
  const idempotencyKey = `outbox:${event.id}`;

  if (event.eventType === "SalesInvoiceCreated") {
    const number = stringPayload(event.payload, "number") ?? event.aggregateId;
    return {
      tenantId: event.tenantId,
      channel: "IN_APP",
      type: "INVOICE_CREATED",
      title: "Invoice created",
      body: `Draft invoice ${number} was created.`,
      href: `/app/sales/invoices/${event.aggregateId}`,
      resourceType: "SalesInvoice",
      resourceId: event.aggregateId,
      idempotencyKey,
    };
  }

  if (event.eventType === "SalesInvoicePosted") {
    const number = stringPayload(event.payload, "number") ?? event.aggregateId;
    return {
      tenantId: event.tenantId,
      channel: "IN_APP",
      type: "INVOICE_POSTED",
      title: "Invoice posted",
      body: `Invoice ${number} was posted.`,
      href: `/app/sales/invoices/${event.aggregateId}`,
      resourceType: "SalesInvoice",
      resourceId: event.aggregateId,
      idempotencyKey,
    };
  }

  if (event.eventType === "PaymentReceived") {
    const number = stringPayload(event.payload, "number") ?? event.aggregateId;
    const amount = amountLabel(event.payload);
    return {
      tenantId: event.tenantId,
      channel: "IN_APP",
      type: "PAYMENT_RECEIVED",
      title: "Payment received",
      body: amount
        ? `Payment ${number} for ${amount} was recorded.`
        : `Payment ${number} was recorded.`,
      href: `/app/sales/payments/${event.aggregateId}`,
      resourceType: "CustomerPayment",
      resourceId: event.aggregateId,
      idempotencyKey,
    };
  }

  if (
    event.eventType === "InventoryMoved" ||
    event.eventType === "InventoryAdjusted" ||
    event.eventType === "InventoryOpened"
  ) {
    return "check_low_stock";
  }

  return null;
}

export function overdueNotificationDraft(input: {
  tenantId: string;
  invoice: { id: string; number: string; customerName: string; dueOn: string };
}): CreateNotificationInput {
  return {
    tenantId: input.tenantId,
    channel: "IN_APP",
    type: "INVOICE_OVERDUE",
    title: "Invoice overdue",
    body: `${input.invoice.number} for ${input.invoice.customerName} was due on ${input.invoice.dueOn}.`,
    href: `/app/sales/invoices/${input.invoice.id}`,
    resourceType: "SalesInvoice",
    resourceId: input.invoice.id,
    idempotencyKey: `invoice-overdue:${input.invoice.id}`,
  };
}

export function lowStockNotificationDraft(input: {
  tenantId: string;
  productId: string;
  productName: string;
  sku: string;
  quantityMajor: string;
  outboxEventId: string;
}): CreateNotificationInput {
  return {
    tenantId: input.tenantId,
    channel: "IN_APP",
    type: "LOW_STOCK",
    title: "Low stock",
    body: `${input.productName} (${input.sku}) is at ${input.quantityMajor}.`,
    href: `/app/inventory/stock/${input.productId}`,
    resourceType: "Product",
    resourceId: input.productId,
    idempotencyKey: `outbox:${input.outboxEventId}`,
  };
}
