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

/**
 * Maps a catalog event to projection families that must be rebuilt from truth.
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
  return families;
}
