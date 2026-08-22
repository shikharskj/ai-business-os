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

/** Outstanding after payments and credits. Clamps at zero (paid invoice + credit is a customer credit). */
export function remainingDocumentBalance(
  grandTotal: Money,
  ...reductions: Money[]
): Money {
  let applied = money(0n, grandTotal.currency, grandTotal.scale);
  for (const reduction of reductions) {
    applied = addMoney(applied, reduction);
  }
  if (applied.amountMinor >= grandTotal.amountMinor) {
    return money(0n, grandTotal.currency, grandTotal.scale);
  }
  return subtractMoney(grandTotal, applied);
}

/**
 * Shared allocation rules for customer receipts and supplier payments.
 * Customer receipts may leave an unallocated remainder (advance / on-account).
 * Supplier payments still require the full amount to be allocated.
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
  allowUnallocated?: boolean;
}): Money {
  if (!isPositive(input.paymentAmount)) {
    throw new PaymentValidationError("Payment amount must be greater than zero.");
  }
  if (input.allocations.length === 0) {
    if (input.allowUnallocated) {
      return money(0n, input.paymentAmount.currency, input.paymentAmount.scale);
    }
    throw new PaymentValidationError(input.emptyMessage);
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
  if (
    !input.allowUnallocated &&
    compareMoney(allocatedTotal, input.paymentAmount) !== 0
  ) {
    throw new PaymentValidationError(
      "Allocate the full payment amount. Unallocated supplier amounts are not recorded."
    );
  }
  if (!input.allowUnallocated && isZero(allocatedTotal)) {
    throw new PaymentValidationError(input.emptyMessage);
  }

  return allocatedTotal;
}

export function allocatedTotal(allocations: Array<{ amount: Money }>, currency = "INR"): Money {
  return allocations.reduce(
    (sum, allocation) => addMoney(sum, allocation.amount),
    money(0n, currency)
  );
}

/** Receipt amount not yet applied to invoices. */
export function unallocatedAmount(input: {
  amount: Money;
  allocations: Array<{ amount: Money }>;
}): Money {
  const applied = allocatedTotal(input.allocations, input.amount.currency);
  if (applied.amountMinor >= input.amount.amountMinor) {
    return money(0n, input.amount.currency, input.amount.scale);
  }
  return subtractMoney(input.amount, applied);
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
    allowUnallocated: true,
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
