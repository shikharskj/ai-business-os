import { z } from "zod";

/**
 * Typed domain-event catalog for the transactional outbox.
 * Emitters should use these string names; consumers register by eventType.
 * Payloads stay small (ids + essentials); load domain data by id when needed.
 */

export const DOMAIN_EVENT_TYPES = [
  // Sales
  "SalesInvoiceCreated",
  "SalesInvoiceUpdated",
  "SalesInvoicePosted",
  "SalesInvoiceCancelled",
  "QuotationConverted",
  "QuotationCreated",
  "QuotationUpdated",
  "QuotationSent",
  "QuotationAccepted",
  "QuotationCancelled",
  // Payments
  "PaymentReceived",
  "PaymentMade",
  // Purchases / expenses
  "PurchaseCreated",
  "PurchaseUpdated",
  "PurchasePosted",
  "PurchaseCancelled",
  "ExpenseRecorded",
  // Inventory
  "InventoryOpened",
  "InventoryAdjusted",
  "InventoryMoved",
  "StockLow",
  // Parties / catalog
  "CustomerCreated",
  "CustomerUpdated",
  "CustomerDeactivated",
  "SupplierCreated",
  "SupplierUpdated",
  "SupplierDeactivated",
  "ProductCreated",
  "ProductUpdated",
  // Accounting
  "JournalPosted",
  "JournalReversed",
  "AccountingPeriodClosed",
  // Post-MVP (emitters land with later specs; AttentionDismissed / AutomationOutcomeRecorded emit in spec 04)
  "InvoiceOverdue",
  "QuotationIdle",
  "AttentionDismissed",
  "AutomationOutcomeRecorded",
  "DocumentUploaded",
  "AIActionExecuted",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export const DOMAIN_EVENT_TYPE_SET: ReadonlySet<string> = new Set(
  DOMAIN_EVENT_TYPES
);

export function isDomainEventType(value: string): value is DomainEventType {
  return DOMAIN_EVENT_TYPE_SET.has(value);
}

/** Canonical aggregate type labels for new emitters (existing rows may use legacy casing). */
export const AGGREGATE_TYPES = [
  "SalesInvoice",
  "Quotation",
  "CustomerPayment",
  "SupplierPayment",
  "Purchase",
  "Expense",
  "Product",
  "Inventory",
  "Customer",
  "Supplier",
  "Journal",
  "Business",
  "Document",
  "AttentionItem",
  "AutomationRun",
] as const;

export type AggregateType = (typeof AGGREGATE_TYPES)[number];

const moneySnapshotSchema = z
  .object({
    amount: z.string(),
    currency: z.string(),
  })
  .passthrough();

/** Loose base: all payloads are objects; typed variants refine known shapes. */
export const domainEventPayloadSchema = z.record(z.string(), z.unknown());

export const salesInvoicePostedPayloadSchema = z
  .object({
    number: z.string().optional(),
    status: z.string().optional(),
    journalId: z.string().optional(),
  })
  .passthrough();

export const paymentReceivedPayloadSchema = z
  .object({
    number: z.string().optional(),
    customerId: z.string().optional(),
    method: z.string().optional(),
    amount: moneySnapshotSchema.optional(),
    invoiceIds: z.array(z.string()).optional(),
    journalId: z.string().optional(),
  })
  .passthrough();

export const purchasePostedPayloadSchema = z
  .object({
    number: z.string().optional(),
    status: z.string().optional(),
    journalId: z.string().optional(),
  })
  .passthrough();

export const expenseRecordedPayloadSchema = z
  .object({
    number: z.string().optional(),
    category: z.string().optional(),
    method: z.string().optional(),
    journalId: z.string().optional(),
  })
  .passthrough();

export const inventoryMovementPayloadSchema = z
  .object({
    movementId: z.string().optional(),
    cause: z.string().optional(),
    direction: z.string().optional(),
    sourceType: z.string().nullable().optional(),
    sourceId: z.string().nullable().optional(),
  })
  .passthrough();

export const quotationAcceptedPayloadSchema = z
  .object({
    number: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const attentionDismissedPayloadSchema = z
  .object({
    attentionItemId: z.string().optional(),
    type: z.string().optional(),
    resourceType: z.string().optional(),
    resourceId: z.string().optional(),
  })
  .passthrough();

export const automationOutcomeRecordedPayloadSchema = z
  .object({
    runId: z.string().optional(),
    outcome: z.string().optional(),
    attentionItemId: z.string().optional(),
    resourceType: z.string().optional(),
    resourceId: z.string().optional(),
    idempotencyKey: z.string().optional(),
  })
  .passthrough();

export const DOMAIN_EVENT_PAYLOAD_SCHEMAS: Partial<
  Record<DomainEventType, z.ZodType<Record<string, unknown>>>
> = {
  SalesInvoicePosted: salesInvoicePostedPayloadSchema,
  PaymentReceived: paymentReceivedPayloadSchema,
  PurchasePosted: purchasePostedPayloadSchema,
  ExpenseRecorded: expenseRecordedPayloadSchema,
  InventoryOpened: inventoryMovementPayloadSchema,
  InventoryAdjusted: inventoryMovementPayloadSchema,
  InventoryMoved: inventoryMovementPayloadSchema,
  QuotationAccepted: quotationAcceptedPayloadSchema,
  AttentionDismissed: attentionDismissedPayloadSchema,
  AutomationOutcomeRecorded: automationOutcomeRecordedPayloadSchema,
};

export function parseDomainEventPayload(
  eventType: string,
  payload: unknown
): Record<string, unknown> {
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(
      `Domain event payload for "${eventType}" must be a plain object`
    );
  }

  const base = domainEventPayloadSchema.parse(payload);
  if (!isDomainEventType(eventType)) {
    return base;
  }
  const schema = DOMAIN_EVENT_PAYLOAD_SCHEMAS[eventType];
  if (!schema) {
    return base;
  }
  return schema.parse(payload);
}

export type DomainOutboxEventInput = {
  tenantId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  correlationId?: string;
};
