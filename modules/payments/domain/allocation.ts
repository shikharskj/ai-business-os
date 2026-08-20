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

export type AllocatableInvoice = {
  invoiceId: string;
  customerId: string;
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

export function validateAllocations(input: {
  customerId: string;
  paymentAmount: Money;
  allocations: PaymentAllocationInput[];
  invoices: AllocatableInvoice[];
}): Money {
  if (input.allocations.length === 0) {
    throw new PaymentValidationError("Allocate the payment to at least one invoice.");
  }
  if (!isPositive(input.paymentAmount)) {
    throw new PaymentValidationError("Payment amount must be greater than zero.");
  }

  const seen = new Set<string>();
  const invoiceById = new Map(input.invoices.map((invoice) => [invoice.invoiceId, invoice]));
  let allocatedTotal = money(0n, input.paymentAmount.currency, input.paymentAmount.scale);

  for (const allocation of input.allocations) {
    if (seen.has(allocation.invoiceId)) {
      throw new PaymentValidationError("Each invoice can appear only once on a payment.");
    }
    seen.add(allocation.invoiceId);

    if (!isPositive(allocation.amount)) {
      throw new PaymentValidationError("Each allocation amount must be greater than zero.");
    }

    const invoice = invoiceById.get(allocation.invoiceId);
    if (!invoice) {
      throw new PaymentValidationError("Invoice was not found.");
    }
    if (invoice.customerId !== input.customerId) {
      throw new PaymentValidationError(
        "Payments can only be allocated to invoices for the selected customer."
      );
    }
    if (compareMoney(allocation.amount, invoice.outstanding) > 0) {
      throw new AllocationExceedsOutstandingError();
    }

    allocatedTotal = addMoney(allocatedTotal, allocation.amount);
  }

  if (compareMoney(allocatedTotal, input.paymentAmount) > 0) {
    throw new AllocationExceedsPaymentError();
  }
  if (compareMoney(allocatedTotal, input.paymentAmount) !== 0) {
    throw new PaymentValidationError(
      "Allocate the full payment amount to invoices. Unallocated receipts are not recorded in the MVP."
    );
  }
  if (isZero(allocatedTotal)) {
    throw new PaymentValidationError("Allocate the payment to at least one invoice.");
  }

  return allocatedTotal;
}
