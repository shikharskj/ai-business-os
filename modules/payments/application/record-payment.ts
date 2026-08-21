import { ensureChartOfAccounts } from "@/modules/accounting/application/seed-chart";
import { postJournal } from "@/modules/accounting/application/post-journal";
import type {
  AccountRepository,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import { PartyInactiveError, PartyNotFoundError } from "@/modules/party/domain/errors";
import type { PartyRepository } from "@/modules/party/infrastructure/repositories";
import {
  remainingOutstanding,
  validateAllocations,
} from "@/modules/payments/domain/allocation";
import { PaymentValidationError } from "@/modules/payments/domain/errors";
import { buildCustomerReceiptJournalLines } from "@/modules/payments/domain/journal";
import {
  formatPaymentNumber,
  paymentFinancialYearKey,
} from "@/modules/payments/domain/numbering";
import { nextInvoicePaymentStatus } from "@/modules/payments/domain/status";
import type {
  CustomerPayment,
  RecordCustomerPaymentInput,
} from "@/modules/payments/domain/types";
import type { PaymentRepository } from "@/modules/payments/infrastructure/repositories";
import { assertInvoiceTransition, isReceivableInvoiceStatus } from "@/modules/sales";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import { money, toMajorString, type Money } from "@/modules/shared-kernel/money";

export type RecordCustomerPaymentDeps = {
  payments: PaymentRepository;
  sales: SalesRepository;
  parties: PartyRepository;
  accounts: AccountRepository;
  journals: JournalRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
};

function moneySnapshot(value: Money) {
  return { amount: toMajorString(value), currency: value.currency };
}

export async function recordCustomerPayment(input: {
  tenantId: string;
  actorUserId: string;
  fields: RecordCustomerPaymentInput;
  financialYearStartMonth: number;
  closedThroughPeriodKey: string | null;
} & RecordCustomerPaymentDeps): Promise<CustomerPayment> {
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

  const uniqueInvoiceIds = [...new Set(input.fields.allocations.map((row) => row.invoiceId))];
  const sortedInvoiceIds = uniqueInvoiceIds.sort();
  const invoices = [];
  for (const invoiceId of sortedInvoiceIds) {
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
  const allocatable = invoices.map((invoice) => {
    if (!isReceivableInvoiceStatus(invoice.status)) {
      throw new PaymentValidationError(
        `Invoice ${invoice.number} cannot receive a payment.`
      );
    }
    const allocated = allocatedTotals.get(invoice.id) ?? money(0n, invoice.grandTotal.currency);
    return {
      invoice,
      allocated,
      outstanding: remainingOutstanding(invoice.grandTotal, allocated),
    };
  });

  validateAllocations({
    customerId: customer.id,
    paymentAmount: input.fields.amount,
    allocations: input.fields.allocations,
    invoices: allocatable.map((row) => ({
      invoiceId: row.invoice.id,
      customerId: row.invoice.customerId,
      outstanding: row.outstanding,
    })),
  });

  await ensureChartOfAccounts({
    tenantId: input.tenantId,
    accountRepository: input.accounts,
  });

  const paymentId = crypto.randomUUID();
  const financialYearKey = paymentFinancialYearKey(
    input.fields.receivedOn,
    input.financialYearStartMonth
  );
  const sequence = await input.payments.allocateNextPaymentNumber(
    input.tenantId,
    financialYearKey
  );
  const number = formatPaymentNumber(financialYearKey, sequence);
  const notes = input.fields.notes?.trim() ? input.fields.notes.trim() : null;
  const reference = input.fields.reference?.trim() ? input.fields.reference.trim() : null;

  const journal = await postJournal({
    tenantId: input.tenantId,
    accountingDate: input.fields.receivedOn,
    financialYearStartMonth: input.financialYearStartMonth,
    closedThroughPeriodKey: input.closedThroughPeriodKey,
    sourceType: "CustomerPayment",
    sourceId: paymentId,
    memo: `Receipt ${number}`,
    lines: buildCustomerReceiptJournalLines({
      paymentNumber: number,
      method: input.fields.method,
      amount: input.fields.amount,
    }),
    accountRepository: input.accounts,
    journalRepository: input.journals,
  });

  const payment = await input.payments.createPayment({
    id: paymentId,
    tenantId: input.tenantId,
    number,
    customerId: customer.id,
    customerName: customer.name,
    receivedOn: input.fields.receivedOn,
    method: input.fields.method,
    amount: input.fields.amount,
    reference,
    notes,
    journalId: journal.id,
    allocations: input.fields.allocations.map((allocation) => ({
      invoiceId: allocation.invoiceId,
      invoiceNumber:
        allocatable.find((row) => row.invoice.id === allocation.invoiceId)?.invoice.number ?? "",
      amount: allocation.amount,
    })),
  });

  for (const row of allocatable) {
    const thisAllocation =
      input.fields.allocations.find((allocation) => allocation.invoiceId === row.invoice.id)
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

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "payment.received",
    resource: "payment",
    resourceId: payment.id,
    metadata: {
      number: payment.number,
      customerId: payment.customerId,
      method: payment.method,
      amount: moneySnapshot(payment.amount),
      invoiceIds: uniqueInvoiceIds,
      journalId: journal.id,
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "PaymentReceived",
    aggregateType: "CustomerPayment",
    aggregateId: payment.id,
    payload: {
      number: payment.number,
      customerId: payment.customerId,
      method: payment.method,
      amount: moneySnapshot(payment.amount),
      invoiceIds: uniqueInvoiceIds,
      journalId: journal.id,
    },
  });

  return payment;
}
