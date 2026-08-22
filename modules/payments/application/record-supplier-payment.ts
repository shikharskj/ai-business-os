import { ensureChartOfAccounts } from "@/modules/accounting/application/seed-chart";
import { postJournal } from "@/modules/accounting/application/post-journal";
import type {
  AccountRepository,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import { PartyInactiveError, PartyNotFoundError } from "@/modules/party/domain/errors";
import type { PartyRepository } from "@/modules/party/infrastructure/repositories";
import {
  remainingDocumentBalance,
  remainingOutstanding,
  validatePurchaseAllocations,
} from "@/modules/payments/domain/allocation";
import { PaymentValidationError } from "@/modules/payments/domain/errors";
import { buildSupplierPaymentJournalLines } from "@/modules/payments/domain/journal";
import {
  formatSupplierPaymentNumber,
  paymentFinancialYearKey,
} from "@/modules/payments/domain/numbering";
import { nextPurchasePaymentStatus } from "@/modules/payments/domain/status";
import type {
  RecordSupplierPaymentInput,
  SupplierPayment,
} from "@/modules/payments/domain/types";
import type { SupplierPaymentRepository } from "@/modules/payments/infrastructure/supplier-payment-repositories";
import {
  assertPurchaseTransition,
  isPayablePurchaseStatus,
} from "@/modules/purchases";
import type { PurchasesRepository } from "@/modules/purchases/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { money, toMajorString, type Money } from "@/modules/shared-kernel/money";

export type RecordSupplierPaymentDeps = {
  supplierPayments: SupplierPaymentRepository;
  purchases: PurchasesRepository;
  parties: PartyRepository;
  accounts: AccountRepository;
  journals: JournalRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
};

function moneySnapshot(value: Money) {
  return { amount: toMajorString(value), currency: value.currency };
}

export async function recordSupplierPayment(input: {
  tenantId: string;
  actorUserId: string;
  fields: RecordSupplierPaymentInput;
  financialYearStartMonth: number;
  closedThroughPeriodKey: string | null;
} & RecordSupplierPaymentDeps): Promise<SupplierPayment> {
  const supplier = await input.parties.findSupplierById(
    input.tenantId,
    input.fields.supplierId
  );
  if (!supplier) {
    throw new PartyNotFoundError();
  }
  if (supplier.status === "INACTIVE") {
    throw new PartyInactiveError("This supplier is inactive and cannot be paid.");
  }

  const uniquePurchaseIds = [
    ...new Set(input.fields.allocations.map((row) => row.purchaseId)),
  ];
  const sortedPurchaseIds = uniquePurchaseIds.sort();
  const purchases = [];
  for (const purchaseId of sortedPurchaseIds) {
    const purchase = await input.purchases.lockPurchaseForUpdate(
      input.tenantId,
      purchaseId
    );
    if (!purchase) {
      throw new PaymentValidationError("Purchase bill was not found.");
    }
    purchases.push(purchase);
  }

  const allocatedTotals = await input.supplierPayments.allocatedTotalsForPurchases(
    input.tenantId,
    uniquePurchaseIds
  );
  const returnedTotals = await input.purchases.returnedTotalsForPurchases(
    input.tenantId,
    uniquePurchaseIds
  );
  const allocatable = purchases.map((purchase) => {
    if (!isPayablePurchaseStatus(purchase.status)) {
      throw new PaymentValidationError(
        `Purchase bill ${purchase.number} cannot receive a payment.`
      );
    }
    const allocated =
      allocatedTotals.get(purchase.id) ?? money(0n, purchase.grandTotal.currency);
    const returned =
      returnedTotals.get(purchase.id) ?? money(0n, purchase.grandTotal.currency);
    return {
      purchase,
      allocated,
      outstanding: remainingDocumentBalance(purchase.grandTotal, allocated, returned),
    };
  });

  validatePurchaseAllocations({
    supplierId: supplier.id,
    paymentAmount: input.fields.amount,
    allocations: input.fields.allocations,
    purchases: allocatable.map((row) => ({
      purchaseId: row.purchase.id,
      supplierId: row.purchase.supplierId,
      outstanding: row.outstanding,
    })),
  });

  await ensureChartOfAccounts({
    tenantId: input.tenantId,
    accountRepository: input.accounts,
  });

  const paymentId = crypto.randomUUID();
  const financialYearKey = paymentFinancialYearKey(
    input.fields.paidOn,
    input.financialYearStartMonth
  );
  const sequence = await input.supplierPayments.allocateNextPaymentNumber(
    input.tenantId,
    financialYearKey
  );
  const number = formatSupplierPaymentNumber(financialYearKey, sequence);
  const notes = input.fields.notes?.trim() ? input.fields.notes.trim() : null;
  const reference = input.fields.reference?.trim() ? input.fields.reference.trim() : null;

  const journal = await postJournal({
    tenantId: input.tenantId,
    accountingDate: input.fields.paidOn,
    financialYearStartMonth: input.financialYearStartMonth,
    closedThroughPeriodKey: input.closedThroughPeriodKey,
    sourceType: "SupplierPayment",
    sourceId: paymentId,
    memo: `Payment ${number}`,
    lines: buildSupplierPaymentJournalLines({
      paymentNumber: number,
      method: input.fields.method,
      amount: input.fields.amount,
    }),
    accountRepository: input.accounts,
    journalRepository: input.journals,
  });

  const payment = await input.supplierPayments.createPayment({
    id: paymentId,
    tenantId: input.tenantId,
    number,
    supplierId: supplier.id,
    supplierName: supplier.name,
    paidOn: input.fields.paidOn,
    method: input.fields.method,
    amount: input.fields.amount,
    reference,
    notes,
    journalId: journal.id,
    allocations: input.fields.allocations.map((allocation) => {
      const purchase = allocatable.find((row) => row.purchase.id === allocation.purchaseId);
      if (!purchase) {
        throw new PaymentValidationError(
          `Purchase ${allocation.purchaseId} was not found in allocatable purchases.`
        );
      }
      return {
        purchaseId: allocation.purchaseId,
        purchaseNumber: purchase.purchase.number,
        amount: allocation.amount,
      };
    }),
  });

  for (const row of allocatable) {
    const thisAllocation =
      input.fields.allocations.find(
        (allocation) => allocation.purchaseId === row.purchase.id
      )?.amount ?? money(0n, row.purchase.grandTotal.currency);
    const outstanding = remainingOutstanding(row.outstanding, thisAllocation);
    const nextStatus = nextPurchasePaymentStatus({
      currentStatus: row.purchase.status,
      grandTotal: row.purchase.grandTotal,
      outstanding,
    });
    if (nextStatus !== row.purchase.status) {
      assertPurchaseTransition(row.purchase.status, nextStatus);
      const updated = await input.purchases.updatePurchaseStatus({
        tenantId: input.tenantId,
        purchaseId: row.purchase.id,
        status: nextStatus,
      });
      if (!updated) {
        throw new PaymentValidationError("Purchase bill was not found.");
      }
    }
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "payment.made",
    resource: "supplier_payment",
    resourceId: payment.id,
    metadata: {
      number: payment.number,
      supplierId: payment.supplierId,
      method: payment.method,
      amount: moneySnapshot(payment.amount),
      purchaseIds: uniquePurchaseIds,
      journalId: journal.id,
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "PaymentMade",
    aggregateType: "SupplierPayment",
    aggregateId: payment.id,
    payload: {
      number: payment.number,
      supplierId: payment.supplierId,
      method: payment.method,
      amount: moneySnapshot(payment.amount),
      purchaseIds: uniquePurchaseIds,
      journalId: journal.id,
    },
  });

  return payment;
}
