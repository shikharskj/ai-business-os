import type { DomainEventType } from "@/modules/events/catalog";
import type { ProjectionFamily } from "@/modules/business-state/domain/types";

const RECEIVABLES_EVENTS: ReadonlySet<string> = new Set<DomainEventType>([
  "SalesInvoicePosted",
  "SalesInvoiceCancelled",
  "PaymentReceived",
]);

const INVENTORY_EVENTS: ReadonlySet<string> = new Set<DomainEventType>([
  "InventoryOpened",
  "InventoryAdjusted",
  "InventoryMoved",
  "StockLow",
]);

const SALES_EVENTS: ReadonlySet<string> = new Set<DomainEventType>([
  "SalesInvoicePosted",
  "SalesInvoiceCancelled",
]);

const CASH_EVENTS: ReadonlySet<string> = new Set<DomainEventType>([
  "PaymentReceived",
  "PaymentMade",
  "ExpenseRecorded",
  "JournalPosted",
  "JournalReversed",
]);

/**
 * Maps a catalog event to projection families that must be rebuilt from truth.
 * Sales invoices do not move cash — only payment/expense/journal events do.
 */
export function projectionFamiliesForEvent(
  eventType: string
): ProjectionFamily[] {
  const families: ProjectionFamily[] = [];
  if (RECEIVABLES_EVENTS.has(eventType)) {
    families.push("receivablesRisk");
  }
  if (INVENTORY_EVENTS.has(eventType)) {
    families.push("inventoryRisk");
  }
  if (SALES_EVENTS.has(eventType)) {
    families.push("salesMomentum");
  }
  if (CASH_EVENTS.has(eventType)) {
    families.push("cashPosition");
  }
  return families;
}
