import { describe, expect, it } from "vitest";

import { businessDate } from "@/modules/shared-kernel/dates";
import { money, toMajorString } from "@/modules/shared-kernel/money";
import { ACCOUNT_CODES } from "@/modules/accounting/domain/types";
import { UnbalancedJournalError, ClosedPeriodError, DuplicateReversalError, InvalidJournalLineError } from "@/modules/accounting/domain/errors";
import { postJournal } from "@/modules/accounting/application/post-journal";
import { reverseJournal } from "@/modules/accounting/application/reverse-journal";
import { ensureChartOfAccounts } from "@/modules/accounting/application/seed-chart";
import {
  createMemoryAccountRepository,
  createMemoryJournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import type { JournalLineDraft } from "@/modules/accounting/domain/types";

function line(
  accountCode: string,
  debitMinor: bigint,
  creditMinor: bigint
): JournalLineDraft {
  return {
    accountCode,
    debit: money(debitMinor),
    credit: money(creditMinor),
  };
}

async function seededRepos() {
  const accountRepository = createMemoryAccountRepository();
  const journalRepository = createMemoryJournalRepository();
  await ensureChartOfAccounts({ tenantId: "t1", accountRepository });
  return { accountRepository, journalRepository };
}

describe("chart of accounts seed", () => {
  it("copies a per-tenant chart rather than sharing mutable rows", async () => {
    const accountRepository = createMemoryAccountRepository();
    await ensureChartOfAccounts({ tenantId: "alpha", accountRepository });
    await ensureChartOfAccounts({ tenantId: "beta", accountRepository });

    const alpha = await accountRepository.listForTenant("alpha");
    const beta = await accountRepository.listForTenant("beta");
    expect(alpha).toHaveLength(11);
    expect(beta).toHaveLength(11);
    expect(alpha[0]!.id).not.toBe(beta[0]!.id);
    expect(alpha[0]!.tenantId).toBe("alpha");
    expect(beta[0]!.tenantId).toBe("beta");

    await ensureChartOfAccounts({ tenantId: "alpha", accountRepository });
    expect(await accountRepository.listForTenant("alpha")).toHaveLength(11);
  });

  it("fills in missing accounts on a partial chart", async () => {
    const accountRepository = createMemoryAccountRepository();
    await accountRepository.ensureChartAccounts([
      {
        tenantId: "partial",
        code: ACCOUNT_CODES.CASH,
        name: "Cash",
        type: "ASSET",
        normalBalance: "DEBIT",
      },
    ]);
    await ensureChartOfAccounts({ tenantId: "partial", accountRepository });
    const accounts = await accountRepository.listForTenant("partial");
    expect(accounts).toHaveLength(11);
    expect(accounts.filter((account) => account.code === ACCOUNT_CODES.CASH)).toHaveLength(1);
  });
});

describe("postJournal", () => {
  it("posts a balanced journal", async () => {
    const repos = await seededRepos();
    const journal = await postJournal({
      tenantId: "t1",
      accountingDate: businessDate("2026-08-19"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "Manual",
      sourceId: "m-1",
      memo: "Sale",
      lines: [
        line(ACCOUNT_CODES.BANK, 11800_00n, 0n),
        line(ACCOUNT_CODES.SALES, 0n, 10000_00n),
        line(ACCOUNT_CODES.OUTPUT_GST, 0n, 1800_00n),
      ],
      ...repos,
    });

    expect(journal.periodKey).toBe("2026-08");
    expect(journal.financialYearKey).toBe("FY2026-27");
    expect(journal.lines).toHaveLength(3);
    expect(toMajorString(journal.lines[0]!.debit)).toBe("11800.00");
  });

  it("rejects an unbalanced journal", async () => {
    const repos = await seededRepos();
    await expect(
      postJournal({
        tenantId: "t1",
        accountingDate: businessDate("2026-08-19"),
        financialYearStartMonth: 4,
        closedThroughPeriodKey: null,
        sourceType: "Manual",
        sourceId: "m-bad",
        lines: [
          line(ACCOUNT_CODES.BANK, 100_00n, 0n),
          line(ACCOUNT_CODES.SALES, 0n, 90_00n),
        ],
        ...repos,
      })
    ).rejects.toBeInstanceOf(UnbalancedJournalError);
  });

  it("rejects mixed currency or scale on journal lines", async () => {
    const repos = await seededRepos();
    await expect(
      postJournal({
        tenantId: "t1",
        accountingDate: businessDate("2026-08-19"),
        financialYearStartMonth: 4,
        closedThroughPeriodKey: null,
        sourceType: "Manual",
        sourceId: "m-fx",
        lines: [
          {
            accountCode: ACCOUNT_CODES.BANK,
            debit: money(100_00n, "INR"),
            credit: money(0n, "INR"),
          },
          {
            accountCode: ACCOUNT_CODES.SALES,
            debit: money(0n, "USD"),
            credit: money(100_00n, "USD"),
          },
        ],
        ...repos,
      })
    ).rejects.toBeInstanceOf(InvalidJournalLineError);
  });

  it("rejects an invalid closed-through month", async () => {
    const repos = await seededRepos();
    await expect(
      postJournal({
        tenantId: "t1",
        accountingDate: businessDate("2026-08-19"),
        financialYearStartMonth: 4,
        closedThroughPeriodKey: "2026-13",
        sourceType: "Manual",
        sourceId: "m-bad-period",
        lines: [
          line(ACCOUNT_CODES.BANK, 100_00n, 0n),
          line(ACCOUNT_CODES.SALES, 0n, 100_00n),
        ],
        ...repos,
      })
    ).rejects.toBeInstanceOf(ClosedPeriodError);
  });

  it("rejects posting into a closed period", async () => {
    const repos = await seededRepos();
    await expect(
      postJournal({
        tenantId: "t1",
        accountingDate: businessDate("2026-03-31"),
        financialYearStartMonth: 4,
        closedThroughPeriodKey: "2026-03",
        sourceType: "Manual",
        sourceId: "m-closed",
        lines: [
          line(ACCOUNT_CODES.BANK, 100_00n, 0n),
          line(ACCOUNT_CODES.SALES, 0n, 100_00n),
        ],
        ...repos,
      })
    ).rejects.toBeInstanceOf(ClosedPeriodError);
  });

  it("does not expose update or delete on posted journals", async () => {
    const { journalRepository } = await seededRepos();
    expect(journalRepository).not.toHaveProperty("update");
    expect(journalRepository).not.toHaveProperty("delete");
    expect(journalRepository).not.toHaveProperty("updatePosted");
  });

  it("keeps stored journal lines unchanged if a caller mutates a returned copy", async () => {
    const repos = await seededRepos();
    const posted = await postJournal({
      tenantId: "t1",
      accountingDate: businessDate("2026-08-19"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "Manual",
      sourceId: "m-immut",
      lines: [
        line(ACCOUNT_CODES.BANK, 25_00n, 0n),
        line(ACCOUNT_CODES.SALES, 0n, 25_00n),
      ],
      ...repos,
    });

    posted.lines[0]!.debit = money(99_00n);
    posted.lines[0]!.accountCode = "9999";

    const reread = await repos.journalRepository.findById("t1", posted.id);
    expect(reread?.lines[0]!.debit.amountMinor).toBe(25_00n);
    expect(reread?.lines[0]!.accountCode).toBe(ACCOUNT_CODES.BANK);
  });
});

describe("reverseJournal", () => {
  it("posts a compensating journal instead of mutating the original", async () => {
    const repos = await seededRepos();
    const original = await postJournal({
      tenantId: "t1",
      accountingDate: businessDate("2026-08-19"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "Manual",
      sourceId: "m-2",
      lines: [
        line(ACCOUNT_CODES.BANK, 50_00n, 0n),
        line(ACCOUNT_CODES.SALES, 0n, 50_00n),
      ],
      ...repos,
    });

    const reversal = await reverseJournal({
      tenantId: "t1",
      journalId: original.id,
      accountingDate: businessDate("2026-08-20"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      ...repos,
    });

    expect(reversal.id).not.toBe(original.id);
    expect(reversal.reversalOfJournalId).toBe(original.id);
    expect(reversal.lines[0]!.accountCode).toBe(ACCOUNT_CODES.BANK);
    expect(reversal.lines[0]!.debit.amountMinor).toBe(0n);
    expect(reversal.lines[0]!.credit.amountMinor).toBe(50_00n);
    expect(repos.journalRepository.listPosted()).toHaveLength(2);
    expect(original.lines[0]!.debit.amountMinor).toBe(50_00n);
  });

  it("rejects a second reversal of the same journal", async () => {
    const repos = await seededRepos();
    const original = await postJournal({
      tenantId: "t1",
      accountingDate: businessDate("2026-08-19"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      sourceType: "Manual",
      sourceId: "m-3",
      lines: [
        line(ACCOUNT_CODES.BANK, 50_00n, 0n),
        line(ACCOUNT_CODES.SALES, 0n, 50_00n),
      ],
      ...repos,
    });

    await reverseJournal({
      tenantId: "t1",
      journalId: original.id,
      accountingDate: businessDate("2026-08-20"),
      financialYearStartMonth: 4,
      closedThroughPeriodKey: null,
      ...repos,
    });

    await expect(
      reverseJournal({
        tenantId: "t1",
        journalId: original.id,
        accountingDate: businessDate("2026-08-21"),
        financialYearStartMonth: 4,
        closedThroughPeriodKey: null,
        ...repos,
      })
    ).rejects.toBeInstanceOf(DuplicateReversalError);
  });
});
