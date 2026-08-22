import { PartyInactiveError, PartyNotFoundError } from "@/modules/party/domain/errors";
import type { PartyRepository } from "@/modules/party/infrastructure/repositories";
import {
  remainingDocumentBalance,
  remainingOutstanding,
  unallocatedAmount,
  validateAllocations,
} from "@/modules/payments/domain/allocation";
import { PaymentNotFoundError, PaymentValidationError } from "@/modules/payments/domain/errors";
import { nextInvoicePaymentStatus } from "@/modules/payments/domain/status";
import type {
  ApplyCustomerAdvanceInput,
  ApplyCustomerCreditInput,
  CustomerPayment,
  PaymentAllocationInput,
} from "@/modules/payments/domain/types";
import type { PaymentRepository } from "@/modules/payments/infrastructure/repositories";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import { assertInvoiceTransition, isReceivableInvoiceStatus } from "@/modules/sales";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  addMoney,
  compareMoney,
  money,
  subtractMoney,
  toMajorString,
  type Money,
} from "@/modules/shared-kernel/money";
import type { SalesInvoiceStatus } from "@/modules/sales/domain/types";

export type ApplyCustomerAdvanceDeps = {
  payments: PaymentRepository;
  sales: SalesRepository;
  parties: PartyRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
};

function moneySnapshot(value: Money) {
  return { amount: toMajorString(value), currency: value.currency };
}

async function lockAllocatableInvoices(input: {
  tenantId: string;
  customerId: string;
  allocations: PaymentAllocationInput[];
  sales: SalesRepository;
  payments: PaymentRepository;
}) {
  const uniqueInvoiceIds = [...new Set(input.allocations.map((row) => row.invoiceId))];
  const invoices = [];
  for (const invoiceId of uniqueInvoiceIds.sort()) {
    const invoice = await input.sales.lockInvoiceForUpdate(input.tenantId, invoiceId);
    if (!invoice) {
      throw new PaymentValidationError("Invoice was not found.");
    }
    invoices.push(invoice);
  }

  const allocatedTotals = await input.payments.allocatedTotalsForInvoices(
    input.tenantId,
    uniqueInvoiceIds
  );
  const creditedTotals = await input.sales.creditedTotalsForInvoices(
    input.tenantId,
    uniqueInvoiceIds
  );
  const allocatable = invoices.map((invoice) => {
    if (!isReceivableInvoiceStatus(invoice.status)) {
      throw new PaymentValidationError(
        `Invoice ${invoice.number} cannot receive a payment.`
      );
    }
    if (invoice.customerId !== input.customerId) {
      throw new PaymentValidationError(
        "Payments can only be allocated to invoices for the selected customer."
      );
    }
    const allocated = allocatedTotals.get(invoice.id) ?? money(0n, invoice.grandTotal.currency);
    const credited = creditedTotals.get(invoice.id) ?? money(0n, invoice.grandTotal.currency);
    return {
      invoice,
      outstanding: remainingDocumentBalance(invoice.grandTotal, allocated, credited),
    };
  });

  return { uniqueInvoiceIds, allocatable };
}

async function updateInvoiceStatuses(input: {
  tenantId: string;
  allocations: PaymentAllocationInput[];
  allocatable: Array<{
    invoice: { id: string; status: SalesInvoiceStatus; grandTotal: Money };
    outstanding: Money;
  }>;
  sales: SalesRepository;
}) {
  for (const row of input.allocatable) {
    const thisAllocation =
      input.allocations.find((allocation) => allocation.invoiceId === row.invoice.id)
        ?.amount ?? money(0n, row.invoice.grandTotal.currency);
    const outstanding = remainingOutstanding(row.outstanding, thisAllocation);
    const nextStatus = nextInvoicePaymentStatus({
      currentStatus: row.invoice.status,
      grandTotal: row.invoice.grandTotal,
      outstanding,
    });
    if (nextStatus !== row.invoice.status) {
      assertInvoiceTransition(row.invoice.status, nextStatus);
      const updated = await input.sales.updateInvoiceStatus({
        tenantId: input.tenantId,
        invoiceId: row.invoice.id,
        status: nextStatus,
      });
      if (!updated) {
        throw new PaymentValidationError("Invoice was not found.");
      }
    }
  }
}

export async function applyCustomerAdvance(input: {
  tenantId: string;
  actorUserId: string;
  fields: ApplyCustomerAdvanceInput;
} & ApplyCustomerAdvanceDeps): Promise<CustomerPayment> {
  const payment = await input.payments.lockPaymentForUpdate(
    input.tenantId,
    input.fields.paymentId
  );
  if (!payment) {
    throw new PaymentNotFoundError();
  }

  const customer = await input.parties.findCustomerById(
    input.tenantId,
    payment.customerId
  );
  if (!customer) {
    throw new PartyNotFoundError();
  }
  if (customer.status === "INACTIVE") {
    throw new PartyInactiveError("This customer is inactive and cannot receive payments.");
  }

  const available = unallocatedAmount(payment);
  if (!available.amountMinor || available.amountMinor <= 0n) {
    throw new PaymentValidationError("This receipt has no remaining customer credit to apply.");
  }

  const { uniqueInvoiceIds, allocatable } = await lockAllocatableInvoices({
    tenantId: input.tenantId,
    customerId: payment.customerId,
    allocations: input.fields.allocations,
    sales: input.sales,
    payments: input.payments,
  });

  validateAllocations({
    customerId: payment.customerId,
    paymentAmount: available,
    allocations: input.fields.allocations,
    invoices: allocatable.map((row) => ({
      invoiceId: row.invoice.id,
      customerId: row.invoice.customerId,
      outstanding: row.outstanding,
    })),
  });

  const updated = await input.payments.addPaymentAllocations({
    tenantId: input.tenantId,
    paymentId: payment.id,
    allocations: input.fields.allocations.map((allocation) => ({
      invoiceId: allocation.invoiceId,
      invoiceNumber:
        allocatable.find((row) => row.invoice.id === allocation.invoiceId)?.invoice.number ??
        "",
      amount: allocation.amount,
    })),
  });
  if (!updated) {
    throw new PaymentNotFoundError();
  }

  await updateInvoiceStatuses({
    tenantId: input.tenantId,
    allocations: input.fields.allocations,
    allocatable,
    sales: input.sales,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "payment.advance_applied",
    resource: "payment",
    resourceId: payment.id,
    metadata: {
      number: payment.number,
      customerId: payment.customerId,
      applied: moneySnapshot(
        input.fields.allocations.reduce(
          (sum, allocation) => addMoney(sum, allocation.amount),
          money(0n, payment.amount.currency)
        )
      ),
      invoiceIds: uniqueInvoiceIds,
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "AdvanceApplied",
    aggregateType: "CustomerPayment",
    aggregateId: payment.id,
    payload: {
      number: payment.number,
      customerId: payment.customerId,
      invoiceIds: uniqueInvoiceIds,
      remaining: moneySnapshot(unallocatedAmount(updated)),
    },
  });

  return updated;
}

function takeFromUnallocated(
  remaining: Money,
  available: Money
): Money {
  return compareMoney(remaining, available) <= 0 ? remaining : available;
}

export async function applyCustomerCredit(input: {
  tenantId: string;
  actorUserId: string;
  fields: ApplyCustomerCreditInput;
} & ApplyCustomerAdvanceDeps): Promise<CustomerPayment[]> {
  const customer = await input.parties.findCustomerById(
    input.tenantId,
    input.fields.customerId
  );
  if (!customer) {
    throw new PartyNotFoundError();
  }
  if (customer.status === "INACTIVE") {
    throw new PartyInactiveError("This customer is inactive and cannot receive payments.");
  }

  const receipts = (await input.payments.listPayments({
    tenantId: input.tenantId,
    customerId: customer.id,
  }))
    .map((payment) => ({ payment, available: unallocatedAmount(payment) }))
    .filter((row) => row.available.amountMinor > 0n)
    .sort(
      (a, b) =>
        a.payment.receivedOn.localeCompare(b.payment.receivedOn) ||
        a.payment.number.localeCompare(b.payment.number)
    );

  const needed = input.fields.allocations.reduce(
    (sum, allocation) => addMoney(sum, allocation.amount),
    money(0n)
  );
  const availableTotal = receipts.reduce(
    (sum, row) => addMoney(sum, row.available),
    money(0n)
  );
  if (compareMoney(needed, availableTotal) > 0) {
    throw new PaymentValidationError(
      "Allocation cannot exceed the customer's unallocated credit."
    );
  }

  const remainingByInvoice = new Map(
    input.fields.allocations.map((allocation) => [allocation.invoiceId, allocation.amount])
  );
  const updated: CustomerPayment[] = [];

  for (const row of receipts) {
    const slices: PaymentAllocationInput[] = [];
    let leftover = row.available;
    for (const allocation of input.fields.allocations) {
      const remaining = remainingByInvoice.get(allocation.invoiceId);
      if (!remaining || remaining.amountMinor <= 0n || leftover.amountMinor <= 0n) {
        continue;
      }
      const take = takeFromUnallocated(remaining, leftover);
      if (take.amountMinor <= 0n) {
        continue;
      }
      slices.push({ invoiceId: allocation.invoiceId, amount: take });
      remainingByInvoice.set(allocation.invoiceId, subtractMoney(remaining, take));
      leftover = subtractMoney(leftover, take);
    }
    if (slices.length === 0) {
      continue;
    }
    updated.push(
      await applyCustomerAdvance({
        ...input,
        fields: { paymentId: row.payment.id, allocations: slices },
      })
    );
  }

  if (updated.length === 0) {
    throw new PaymentValidationError("This customer has no remaining credit to apply.");
  }

  return updated;
}
