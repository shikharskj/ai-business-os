import {
  addMoney,
  compareMoney,
  isPositive,
  isZero,
  money,
  subtractMoney,
  type Money,
} from "@/modules/shared-kernel/money";
import {
  AllocationExceedsOutstandingError,
  AllocationExceedsPaymentError,
  PaymentValidationError,
} from "@/modules/payments/domain/errors";
import type { PaymentAllocationInput } from "@/modules/payments/domain/types";
import type { SupplierPaymentAllocationInput } from "@/modules/payments/domain/types";

export type AllocatableDocument = {
  documentId: string;
  partyId: string;
  outstanding: Money;
};

export type AllocatableInvoice = {
  invoiceId: string;
  customerId: string;
  outstanding: Money;
};

export type AllocatablePurchase = {
  purchaseId: string;
  supplierId: string;
  outstanding: Money;
};

export function remainingOutstanding(
  grandTotal: Money,
  allocated: Money
): Money {
  const remaining = subtractMoney(grandTotal, allocated);
  if (remaining.amountMinor < 0n) {
    throw new AllocationExceedsOutstandingError();
  }
  return remaining;
}

/**
 * Shared allocation rules for customer receipts and supplier payments.
 * Full payment amount must be allocated; no over-allocation to documents or payment.
 */
export function validateDocumentAllocations(input: {
  partyId: string;
  paymentAmount: Money;
  allocations: Array<{ documentId: string; amount: Money }>;
  documents: AllocatableDocument[];
  emptyMessage: string;
  duplicateMessage: string;
  notFoundMessage: string;
  partyMismatchMessage: string;
}): Money {
  if (input.allocations.length === 0) {
    throw new PaymentValidationError(input.emptyMessage);
  }
  if (!isPositive(input.paymentAmount)) {
    throw new PaymentValidationError("Payment amount must be greater than zero.");
  }

  const seen = new Set<string>();
  const documentById = new Map(
    input.documents.map((document) => [document.documentId, document])
  );
  let allocatedTotal = money(0n, input.paymentAmount.currency, input.paymentAmount.scale);

  for (const allocation of input.allocations) {
    if (seen.has(allocation.documentId)) {
      throw new PaymentValidationError(input.duplicateMessage);
    }
    seen.add(allocation.documentId);

    if (!isPositive(allocation.amount)) {
      throw new PaymentValidationError("Each allocation amount must be greater than zero.");
    }

    const document = documentById.get(allocation.documentId);
    if (!document) {
      throw new PaymentValidationError(input.notFoundMessage);
    }
    if (document.partyId !== input.partyId) {
      throw new PaymentValidationError(input.partyMismatchMessage);
    }
    if (compareMoney(allocation.amount, document.outstanding) > 0) {
      throw new AllocationExceedsOutstandingError();
    }

    allocatedTotal = addMoney(allocatedTotal, allocation.amount);
  }

  if (compareMoney(allocatedTotal, input.paymentAmount) > 0) {
    throw new AllocationExceedsPaymentError();
  }
  if (compareMoney(allocatedTotal, input.paymentAmount) !== 0) {
    throw new PaymentValidationError(
      "Allocate the full payment amount. Unallocated amounts are not recorded in the MVP."
    );
  }
  if (isZero(allocatedTotal)) {
    throw new PaymentValidationError(input.emptyMessage);
  }

  return allocatedTotal;
}

export function validateAllocations(input: {
  customerId: string;
  paymentAmount: Money;
  allocations: PaymentAllocationInput[];
  invoices: AllocatableInvoice[];
}): Money {
  return validateDocumentAllocations({
    partyId: input.customerId,
    paymentAmount: input.paymentAmount,
    allocations: input.allocations.map((allocation) => ({
      documentId: allocation.invoiceId,
      amount: allocation.amount,
    })),
    documents: input.invoices.map((invoice) => ({
      documentId: invoice.invoiceId,
      partyId: invoice.customerId,
      outstanding: invoice.outstanding,
    })),
    emptyMessage: "Allocate the payment to at least one invoice.",
    duplicateMessage: "Each invoice can appear only once on a payment.",
    notFoundMessage: "Invoice was not found.",
    partyMismatchMessage:
      "Payments can only be allocated to invoices for the selected customer.",
  });
}

export function validatePurchaseAllocations(input: {
  supplierId: string;
  paymentAmount: Money;
  allocations: SupplierPaymentAllocationInput[];
  purchases: AllocatablePurchase[];
}): Money {
  return validateDocumentAllocations({
    partyId: input.supplierId,
    paymentAmount: input.paymentAmount,
    allocations: input.allocations.map((allocation) => ({
      documentId: allocation.purchaseId,
      amount: allocation.amount,
    })),
    documents: input.purchases.map((purchase) => ({
      documentId: purchase.purchaseId,
      partyId: purchase.supplierId,
      outstanding: purchase.outstanding,
    })),
    emptyMessage: "Allocate the payment to at least one purchase bill.",
    duplicateMessage: "Each purchase bill can appear only once on a payment.",
    notFoundMessage: "Purchase bill was not found.",
    partyMismatchMessage:
      "Payments can only be allocated to bills for the selected supplier.",
  });
}
