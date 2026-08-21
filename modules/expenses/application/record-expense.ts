import { ensureChartOfAccounts } from "@/modules/accounting/application/seed-chart";
import { postJournal } from "@/modules/accounting/application/post-journal";
import type {
  AccountRepository,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import { ExpenseValidationError } from "@/modules/expenses/domain/errors";
import { buildExpenseJournalLines } from "@/modules/expenses/domain/journal";
import {
  expenseFinancialYearKey,
  formatExpenseNumber,
} from "@/modules/expenses/domain/numbering";
import type {
  Expense,
  ExpenseTaxContext,
  RecordExpenseInput,
} from "@/modules/expenses/domain/types";
import type { ExpenseRepository } from "@/modules/expenses/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { persistDomainEvent } from "@/modules/events/application/persist-domain-event";
import { toMajorString, type Money } from "@/modules/shared-kernel/money";
import { calculateTax } from "@/modules/tax/application/calculate-tax";
import { stateCodeFromName } from "@/modules/tax/domain/gstin";
import type {
  HsnSacRepository,
  TaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";

export type RecordExpenseDeps = {
  expenses: ExpenseRepository;
  accounts: AccountRepository;
  journals: JournalRepository;
  taxRates: TaxRateRepository;
  hsnSac: HsnSacRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
};

function moneySnapshot(value: Money) {
  return { amount: toMajorString(value), currency: value.currency };
}

export async function recordExpense(input: {
  tenantId: string;
  actorUserId: string;
  fields: RecordExpenseInput;
  taxContext: ExpenseTaxContext;
  closedThroughPeriodKey: string | null;
} & RecordExpenseDeps): Promise<Expense> {
  if (input.fields.amount.amountMinor <= 0n) {
    throw new ExpenseValidationError("Expense amount must be greater than zero.");
  }

  const vendorGstin = input.fields.vendorGstin?.trim()
    ? input.fields.vendorGstin.trim().toUpperCase()
    : null;
  const taxRateBps = input.fields.taxRateBps ?? 0;
  const placeOfSupplyStateCode = stateCodeFromName(input.taxContext.stateName);
  if (!placeOfSupplyStateCode) {
    throw new ExpenseValidationError("Business state is required to calculate GST.");
  }

  const gst = await calculateTax({
    tenantId: input.tenantId,
    businessGstin: input.taxContext.gstin,
    businessGstRegistrationStatus: input.taxContext.gstRegistrationStatus,
    businessStateName: input.taxContext.stateName,
    counterpartyGstin: vendorGstin,
    placeOfSupplyStateCode,
    transactionType: "EXPENSE",
    taxableAmount: input.fields.amount,
    taxRateBps,
    defaultGstRateBps: input.taxContext.defaultGstRateBps,
    transactionDate: input.fields.incurredOn,
    taxRateRepository: input.taxRates,
    hsnSacRepository: input.hsnSac,
  });

  await ensureChartOfAccounts({
    tenantId: input.tenantId,
    accountRepository: input.accounts,
  });

  const expenseId = crypto.randomUUID();
  const financialYearKey = expenseFinancialYearKey(
    input.fields.incurredOn,
    input.taxContext.financialYearStartMonth
  );
  const sequence = await input.expenses.allocateNextExpenseNumber(
    input.tenantId,
    financialYearKey
  );
  const number = formatExpenseNumber(financialYearKey, sequence);
  const notes = input.fields.notes?.trim() ? input.fields.notes.trim() : null;

  const journal = await postJournal({
    tenantId: input.tenantId,
    accountingDate: input.fields.incurredOn,
    financialYearStartMonth: input.taxContext.financialYearStartMonth,
    closedThroughPeriodKey: input.closedThroughPeriodKey,
    sourceType: "Expense",
    sourceId: expenseId,
    memo: `Expense ${number}`,
    lines: buildExpenseJournalLines({
      expenseNumber: number,
      method: input.fields.method,
      taxableAmount: gst.taxableAmount,
      totalTax: gst.totalTax,
      grandTotal: gst.grandTotal,
    }),
    accountRepository: input.accounts,
    journalRepository: input.journals,
  });

  const expense = await input.expenses.createExpense({
    id: expenseId,
    tenantId: input.tenantId,
    number,
    category: input.fields.category,
    incurredOn: input.fields.incurredOn,
    method: input.fields.method,
    vendorGstin,
    notes,
    taxableAmount: gst.taxableAmount,
    taxRateBps: gst.taxRateBps,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    totalTax: gst.totalTax,
    grandTotal: gst.grandTotal,
    supplyType: gst.supplyType,
    treatment: gst.treatment,
    journalId: journal.id,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "expense.recorded",
    resource: "expense",
    resourceId: expense.id,
    metadata: {
      number: expense.number,
      category: expense.category,
      method: expense.method,
      taxableAmount: moneySnapshot(expense.taxableAmount),
      totalTax: moneySnapshot(expense.totalTax),
      grandTotal: moneySnapshot(expense.grandTotal),
      journalId: journal.id,
    },
  });

  await persistDomainEvent(input.outbox, {
    tenantId: input.tenantId,
    eventType: "ExpenseRecorded",
    aggregateType: "Expense",
    aggregateId: expense.id,
    payload: {
      number: expense.number,
      category: expense.category,
      method: expense.method,
      taxableAmount: moneySnapshot(expense.taxableAmount),
      totalTax: moneySnapshot(expense.totalTax),
      grandTotal: moneySnapshot(expense.grandTotal),
      journalId: journal.id,
    },
  });

  return expense;
}
