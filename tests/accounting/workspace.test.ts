import { describe, expect, it } from "vitest";

import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";
import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  ACCOUNT_CODES,
  ClosedPeriodError,
  closeAccountingPeriod,
  createMemoryAccountRepository,
  createMemoryJournalRepository,
  ensureChartOfAccounts,
  getLedger,
  getTrialBalance,
  postAdjustmentJournal,
  postJournal,
  reversePostedJournal,
} from "@/modules/accounting";
import { createMemoryBusinessRepository } from "@/modules/tenant/infrastructure/repositories";

async function seededRepos(tenantId = "tenant-a") {
  const accounts = createMemoryAccountRepository();
  const journals = createMemoryJournalRepository();
  await ensureChartOfAccounts({ tenantId, accountRepository: accounts });
  return { accounts, journals };
}

describe("accounting workspace", () => {
  it("builds a balanced trial balance for a period with posted activity", async () => {
    const { accounts, journals } = await seededRepos();
    await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-10"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "SalesInvoice",
      sourceId: "inv-1",
      lines: [
        {
          accountCode: ACCOUNT_CODES.RECEIVABLE,
          debit: money(1180_00n),
          credit: money(0n),
        },
        {
          accountCode: ACCOUNT_CODES.SALES,
          debit: money(0n),
          credit: money(1000_00n),
        },
        {
          accountCode: ACCOUNT_CODES.OUTPUT_GST,
          debit: money(0n),
          credit: money(180_00n),
        },
      ],
      accountRepository: accounts,
      journalRepository: journals,
    });
    await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-12"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "Expense",
      sourceId: "exp-1",
      lines: [
        {
          accountCode: ACCOUNT_CODES.OPERATING_EXPENSE,
          debit: money(500_00n),
          credit: money(0n),
        },
        {
          accountCode: ACCOUNT_CODES.CASH,
          debit: money(0n),
          credit: money(500_00n),
        },
      ],
      accountRepository: accounts,
      journalRepository: journals,
    });

    const tb = await getTrialBalance({
      tenantId: "tenant-a",
      periodKey: "2026-08",
      accounts,
      journals,
    });
    expect(tb.isBalanced).toBe(true);
    expect(toMajorString(tb.totalDebits)).toBe(toMajorString(tb.totalCredits));
    expect(tb.rows.length).toBeGreaterThan(0);
  });

  it("reverses a posted journal by creating a new balanced journal", async () => {
    const { accounts, journals } = await seededRepos();
    const original = await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-10"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "Manual",
      sourceId: "m-1",
      lines: [
        {
          accountCode: ACCOUNT_CODES.BANK,
          debit: money(100_00n),
          credit: money(0n),
        },
        {
          accountCode: ACCOUNT_CODES.CAPITAL,
          debit: money(0n),
          credit: money(100_00n),
        },
      ],
      accountRepository: accounts,
      journalRepository: journals,
    });

    const reversal = await reversePostedJournal({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      journalId: original.id,
      accountingDate: businessDate("2026-08-11"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      accounts,
      journals,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });

    expect(reversal.reversalOfJournalId).toBe(original.id);
    expect(reversal.id).not.toBe(original.id);
    const stillOriginal = await journals.findById("tenant-a", original.id);
    expect(stillOriginal?.lines[0]?.debit.amountMinor).toBe(100_00n);
  });

  it("rejects posts into a closed period after closeAccountingPeriod", async () => {
    const businesses = createMemoryBusinessRepository([
      {
        id: "tenant-a",
        clerkOrganizationId: "org_a",
        name: "Acme",
        type: "PROPRIETORSHIP",
        ownerUserId: "user-1",
        addressLine1: "1 Main",
        addressLine2: null,
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
        country: "IN",
        phone: "9999999999",
        email: "a@example.com",
        gstRegistrationStatus: "NOT_REGISTERED",
        gstin: null,
        financialYearStartMonth: 4,
        timezone: "Asia/Kolkata",
        currency: "INR",
        defaultGstRateBps: 1800,
        lowStockThreshold: "5",
        closedThroughPeriodKey: null,
      },
    ]);
    const { accounts, journals } = await seededRepos();

    await closeAccountingPeriod({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      periodKey: "2026-08",
      today: businessDate("2026-08-20"),
      businesses,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });

    const business = await businesses.findById("tenant-a");
    expect(business?.closedThroughPeriodKey).toBe("2026-08");

    await expect(
      postJournal({
        tenantId: "tenant-a",
        accountingDate: businessDate("2026-08-15"),
        financialYearStartMonth: 4,
        closedThroughPeriodKey: business!.closedThroughPeriodKey,
        sourceType: "Manual",
        sourceId: "late",
        lines: [
          {
            accountCode: ACCOUNT_CODES.CASH,
            debit: money(10_00n),
            credit: money(0n),
          },
          {
            accountCode: ACCOUNT_CODES.CAPITAL,
            debit: money(0n),
            credit: money(10_00n),
          },
        ],
        accountRepository: accounts,
        journalRepository: journals,
      })
    ).rejects.toBeInstanceOf(ClosedPeriodError);
  });

  it("rejects cross-tenant ledger access", async () => {
    const a = await seededRepos("tenant-a");
    const b = await seededRepos("tenant-b");
    const posted = await postJournal({
      tenantId: "tenant-a",
      accountingDate: businessDate("2026-08-10"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "Manual",
      sourceId: "a-1",
      lines: [
        {
          accountCode: ACCOUNT_CODES.CASH,
          debit: money(50_00n),
          credit: money(0n),
        },
        {
          accountCode: ACCOUNT_CODES.CAPITAL,
          debit: money(0n),
          credit: money(50_00n),
        },
      ],
      accountRepository: a.accounts,
      journalRepository: a.journals,
    });
    const accountId = posted.lines[0]!.accountId;

    await expect(
      getLedger({
        tenantId: "tenant-b",
        accountId,
        accounts: b.accounts,
        journals: b.journals,
      })
    ).rejects.toThrow("Account was not found.");
  });

  it("posts an adjustment journal through the workspace use case", async () => {
    const { accounts, journals } = await seededRepos();
    const journal = await postAdjustmentJournal({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      accountingDate: businessDate("2026-08-18"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      memo: "Opening capital",
      lines: [
        {
          accountCode: ACCOUNT_CODES.BANK,
          debit: money(1000_00n),
          credit: money(0n),
        },
        {
          accountCode: ACCOUNT_CODES.CAPITAL,
          debit: money(0n),
          credit: money(1000_00n),
        },
      ],
      accounts,
      journals,
      audit: createMemoryAuditRepository(),
      outbox: createMemoryOutboxRepository(),
    });
    expect(journal.sourceType).toBe("Adjustment");
    expect(journal.memo).toBe("Opening capital");
  });
});
