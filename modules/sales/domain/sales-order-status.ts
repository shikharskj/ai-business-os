import { SalesOrderStatusError } from "@/modules/sales/domain/errors";
import type { SalesOrderStatus } from "@/modules/sales/domain/types";

const TRANSITIONS: Record<SalesOrderStatus, readonly SalesOrderStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["FULFILLED", "CANCELLED"],
  CANCELLED: [],
  FULFILLED: [],
};

export function canTransitionSalesOrderStatus(
  from: SalesOrderStatus,
  to: SalesOrderStatus
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertSalesOrderTransition(
  from: SalesOrderStatus,
  to: SalesOrderStatus
): void {
  if (!canTransitionSalesOrderStatus(from, to)) {
    throw new SalesOrderStatusError(
      `A ${from.toLowerCase()} sales order cannot be marked ${to.toLowerCase()}.`
    );
  }
}

export function assertSalesOrderEditable(status: SalesOrderStatus): void {
  if (status !== "DRAFT") {
    throw new SalesOrderStatusError(
      "Only draft sales orders can be edited. Cancel and create a new order if the customer or lines need to change."
    );
  }
}

export function salesOrderStatusLabel(status: SalesOrderStatus): string {
  if (status === "DRAFT") return "Draft";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "CANCELLED") return "Cancelled";
  return "Fulfilled";
}
