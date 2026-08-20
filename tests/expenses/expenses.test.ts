import { describe, expect, it } from "vitest";

import { createMemoryStorageAdapter } from "@/lib/storage/memory-adapter";
import { ACCOUNT_CODES } from "@/modules/accounting/domain/types";
import {
  createMemoryAccountRepository,
  createMemoryJournalRepository,
  ensureChartOfAccounts,
} from "@/modules/accounting";
import { createMemoryDocumentRepository } from "@/modules/documents/infrastructure/repositories";
import {
  attachExpenseDocument,
  createMemoryExpenseRepository,
  ExpenseNotFoundError,
  getExpense,
  listExpenses,
  recordExpense,
  type ExpenseTaxContext,
} from "@/modules/expenses";
import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  createMemoryHsnSacRepository,
  createMemoryTaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";

const maharashtraGstin = "27AABCU9603R1ZM";
const karnatakaGstin = "29AABCU9603R1Z1";
const PDF_BYTES = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

function taxContext(
  overrides: Partial<ExpenseTaxContext> = {}
): ExpenseTaxContext {
  return {
    gstin: maharashtraGstin,
    gstRegistrationStatus: "REGISTERED",
    stateName: "Maharashtra",
    defaultGstRateBps: 1800,
    financialYearStartMonth: 4,
    currency: "INR",
    ...overrides,
  };
}

function repos() {
  return {
    expenses: createMemoryExpenseRepository(),
    accounts: createMemoryAccountRepository(),
    journals: createMemoryJournalRepository(),
    taxRates: createMemoryTaxRateRepository(),
    hsnSac: createMemoryHsnSacRepository(),
    audit: createMemoryAuditRepository(),
    outbox: createMemoryOutboxRepository(),
  };
}

async function record(
  tenantId: string,
  fields: Parameters<typeof recordExpense>[0]["fields"],
  extra: ReturnType<typeof repos> = repos(),
  context: ExpenseTaxContext = taxContext()
) {
  await ensureChartOfAccounts({
    tenantId,
    accountRepository: extra.accounts,
  });
  const expense = await recordExpense({
    tenantId,
    actorUserId: "user-1",
    fields,
    taxContext: context,
    closedThroughPeriodKey: null,
    ...extra,
  });
  return { expense, ...extra };
}

describe("recordExpense", () => {
  it("posts a balanced cash journal for an untaxed expense", async () => {
    const { expense, journals, accounts, outbox, audit } = await record("tenant-a", {
      category: "RENT",
      incurredOn: businessDate("2026-04-10"),
      method: "CASH",
      amount: money(2500_00n),
      taxRateBps: 0,
    });

    expect(expense.number).toMatch(/^EXP\/FY2026-27\/\d{4}$/);
    expect(toMajorString(expense.grandTotal)).toBe("2500.00");
    expect(expense.totalTax.amountMinor).toBe(0n);
    expect(expense.journalId).toBeTruthy();

    const journal = journals.listPosted().find((row) => row.id === expense.journalId);
    expect(journal).toBeTruthy();
    const debits = journal!.lines.reduce((sum, line) => sum + line.debit.amountMinor, 0n);
    const credits = journal!.lines.reduce((sum, line) => sum + line.credit.amountMinor, 0n);
    expect(debits).toBe(credits);
    expect(debits).toBe(2500_00n);

    const cash = accounts.accounts.find((account) => account.code === ACCOUNT_CODES.CASH);
    const operating = accounts.accounts.find(
      (account) => account.code === ACCOUNT_CODES.OPERATING_EXPENSE
    );
    expect(
      journal!.lines.some(
        (line) => line.accountId === operating?.id && line.debit.amountMinor === 2500_00n
      )
    ).toBe(true);
    expect(
      journal!.lines.some(
        (line) => line.accountId === cash?.id && line.credit.amountMinor === 2500_00n
      )
    ).toBe(true);
    expect(outbox.events.some((event) => event.eventType === "ExpenseRecorded")).toBe(true);
    expect(audit.records.some((record) => record.action === "expense.recorded")).toBe(true);
  });

  it("credits bank for UPI and applies intra-state input GST", async () => {
    const { expense, journals, accounts } = await record("tenant-a", {
      category: "TRAVEL",
      incurredOn: businessDate("2026-04-11"),
      method: "UPI",
      amount: money(1000_00n),
      taxRateBps: 1800,
      vendorGstin: maharashtraGstin,
    });

    expect(toMajorString(expense.taxableAmount)).toBe("1000.00");
    expect(toMajorString(expense.cgst)).toBe("90.00");
    expect(toMajorString(expense.sgst)).toBe("90.00");
    expect(toMajorString(expense.totalTax)).toBe("180.00");
    expect(toMajorString(expense.grandTotal)).toBe("1180.00");
    expect(expense.supplyType).toBe("INTRA_STATE");

    const journal = journals.listPosted().find((row) => row.id === expense.journalId)!;
    const debits = journal.lines.reduce((sum, line) => sum + line.debit.amountMinor, 0n);
    const credits = journal.lines.reduce((sum, line) => sum + line.credit.amountMinor, 0n);
    expect(debits).toBe(credits);
    expect(debits).toBe(1180_00n);

    const bank = accounts.accounts.find((account) => account.code === ACCOUNT_CODES.BANK);
    const inputGst = accounts.accounts.find(
      (account) => account.code === ACCOUNT_CODES.INPUT_GST
    );
    expect(
      journal.lines.some(
        (line) => line.accountId === inputGst?.id && line.debit.amountMinor === 180_00n
      )
    ).toBe(true);
    expect(
      journal.lines.some(
        (line) => line.accountId === bank?.id && line.credit.amountMinor === 1180_00n
      )
    ).toBe(true);
  });

  it("does not charge GST without a vendor GSTIN even when a rate is selected", async () => {
    const { expense } = await record("tenant-a", {
      category: "MEALS",
      incurredOn: businessDate("2026-04-12"),
      method: "CARD",
      amount: money(400_00n),
      taxRateBps: 1800,
    });

    expect(expense.treatment).toBe("UNREGISTERED_COUNTERPARTY");
    expect(expense.totalTax.amountMinor).toBe(0n);
    expect(expense.grandTotal.amountMinor).toBe(400_00n);
  });

  it("uses IGST for an inter-state vendor", async () => {
    const { expense } = await record("tenant-a", {
      category: "SOFTWARE",
      incurredOn: businessDate("2026-04-13"),
      method: "BANK_TRANSFER",
      amount: money(2000_00n),
      taxRateBps: 1800,
      vendorGstin: karnatakaGstin,
    });

    expect(expense.supplyType).toBe("INTER_STATE");
    expect(expense.igst.amountMinor).toBe(360_00n);
    expect(expense.cgst.amountMinor).toBe(0n);
    expect(expense.grandTotal.amountMinor).toBe(2360_00n);
  });
});

describe("expense queries", () => {
  it("filters by category and date", async () => {
    const extra = repos();
    await record(
      "tenant-a",
      {
        category: "RENT",
        incurredOn: businessDate("2026-04-01"),
        method: "CASH",
        amount: money(100_00n),
      },
      extra
    );
    await record(
      "tenant-a",
      {
        category: "TRAVEL",
        incurredOn: businessDate("2026-04-20"),
        method: "CASH",
        amount: money(200_00n),
      },
      extra
    );

    const travel = await listExpenses({
      tenantId: "tenant-a",
      category: "TRAVEL",
      expenses: extra.expenses,
    });
    expect(travel).toHaveLength(1);
    expect(travel[0]?.category).toBe("TRAVEL");

    const aprilEarly = await listExpenses({
      tenantId: "tenant-a",
      fromDate: businessDate("2026-04-01"),
      toDate: businessDate("2026-04-10"),
      expenses: extra.expenses,
    });
    expect(aprilEarly).toHaveLength(1);
    expect(aprilEarly[0]?.category).toBe("RENT");
  });

  it("rejects cross-tenant get-by-id", async () => {
    const { expense, expenses } = await record("tenant-a", {
      category: "OFFICE",
      incurredOn: businessDate("2026-04-14"),
      method: "CASH",
      amount: money(50_00n),
    });

    await expect(
      getExpense({ tenantId: "tenant-b", expenseId: expense.id, expenses })
    ).rejects.toBeInstanceOf(ExpenseNotFoundError);
  });
});

describe("expense attachments", () => {
  it("attaches evidence through the documents module", async () => {
    const { expense, expenses } = await record("tenant-a", {
      category: "OFFICE",
      incurredOn: businessDate("2026-04-15"),
      method: "CASH",
      amount: money(75_00n),
    });
    const documents = createMemoryDocumentRepository();
    const storage = createMemoryStorageAdapter({ maxBytes: 1024 * 1024 });
    const audit = createMemoryAuditRepository();

    const uploaded = await attachExpenseDocument({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      expenseId: expense.id,
      filename: "receipt.pdf",
      bytes: PDF_BYTES,
      expenses,
      documents,
      storage,
      audit,
    });

    expect(uploaded.ownerRecordType).toBe("EXPENSE");
    expect(uploaded.ownerRecordId).toBe(expense.id);
    expect(uploaded.filename).toBe("receipt.pdf");
  });

  it("rejects attaching to another tenant's expense", async () => {
    const { expense, expenses } = await record("tenant-a", {
      category: "OFFICE",
      incurredOn: businessDate("2026-04-16"),
      method: "CASH",
      amount: money(80_00n),
    });

    await expect(
      attachExpenseDocument({
        tenantId: "tenant-b",
        actorUserId: "user-2",
        expenseId: expense.id,
        filename: "receipt.pdf",
        bytes: PDF_BYTES,
        expenses,
        documents: createMemoryDocumentRepository(),
        storage: createMemoryStorageAdapter({ maxBytes: 1024 * 1024 }),
        audit: createMemoryAuditRepository(),
      })
    ).rejects.toBeInstanceOf(ExpenseNotFoundError);
  });
});
