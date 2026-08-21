import type { BusinessDate } from "@/modules/shared-kernel/dates";
import { money, addMoney, type Money } from "@/modules/shared-kernel/money";

import { DuplicateReversalError } from "@/modules/accounting/domain/errors";
import type { Account, PostedJournal } from "@/modules/accounting/domain/types";
import type { JournalLineDraft } from "@/modules/accounting/domain/types";
import type {
  JournalListFilter,
  JournalSummary,
  LedgerLine,
  LedgerQuery,
  TrialBalance,
  TrialBalanceRow,
} from "@/modules/accounting/domain/workspace-types";

export type AccountRepository = {
  listForTenant(tenantId: string): Promise<Account[]>;
  findByCode(tenantId: string, code: string): Promise<Account | null>;
  findById(tenantId: string, accountId: string): Promise<Account | null>;
  ensureChartAccounts(accounts: Omit<Account, "id">[]): Promise<Account[]>;
};

export type JournalInsert = {
  tenantId: string;
  accountingDate: BusinessDate;
  periodKey: string;
  financialYearKey: string;
  sourceType: string;
  sourceId: string;
  memo: string | null;
  reversalOfJournalId: string | null;
  lines: Array<JournalLineDraft & { accountId: string }>;
};

export type JournalRepository = {
  insertPosted(input: JournalInsert): Promise<PostedJournal>;
  findById(tenantId: string, journalId: string): Promise<PostedJournal | null>;
  listJournals(filter: JournalListFilter): Promise<JournalSummary[]>;
  listLedgerLines(query: LedgerQuery): Promise<
    Array<Omit<LedgerLine, "balance" | "accountCode" | "accountName">>
  >;
  trialBalanceForPeriod(
    tenantId: string,
    periodKey: string
  ): Promise<Array<Omit<TrialBalanceRow, "accountCode" | "accountName" | "accountType" | "normalBalance"> & { accountId: string }>>;
  /**
   * All-time debit/credit totals for the given accounts (tenant-scoped).
   * Amounts are tagged with `currency`. Scale comes from the ledger lines
   * (not a default of 2); mixed-scale lines are rejected.
   */
  accountTotals(
    tenantId: string,
    accountIds: string[],
    currency: string
  ): Promise<
    Array<{ accountId: string; debitTotal: Money; creditTotal: Money }>
  >;
  findReversalOf(
    tenantId: string,
    originalJournalId: string
  ): Promise<PostedJournal | null>;
};

export function createMemoryAccountRepository(
  initial: Account[] = []
): AccountRepository & { accounts: Account[] } {
  const accounts = [...initial];
  return {
    accounts,
    async listForTenant(tenantId) {
      return accounts
        .filter((account) => account.tenantId === tenantId)
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code));
    },
    async findByCode(tenantId, code) {
      return (
        accounts.find(
          (account) => account.tenantId === tenantId && account.code === code
        ) ?? null
      );
    },
    async findById(tenantId, accountId) {
      return (
        accounts.find(
          (account) => account.tenantId === tenantId && account.id === accountId
        ) ?? null
      );
    },
    async ensureChartAccounts(rows) {
      const created: Account[] = [];
      for (const row of rows) {
        const existing = accounts.find(
          (account) =>
            account.tenantId === row.tenantId && account.code === row.code
        );
        if (existing) {
          created.push(existing);
          continue;
        }
        const account: Account = { ...row, id: crypto.randomUUID() };
        accounts.push(account);
        created.push(account);
      }
      return created;
    },
  };
}

function journalTotals(journal: PostedJournal): { debit: Money; credit: Money } {
  return journal.lines.reduce(
    (totals, line) => ({
      debit: addMoney(totals.debit, line.debit),
      credit: addMoney(totals.credit, line.credit),
    }),
    { debit: money(0n), credit: money(0n) }
  );
}

function toSummary(journal: PostedJournal): JournalSummary {
  const totals = journalTotals(journal);
  return {
    id: journal.id,
    tenantId: journal.tenantId,
    accountingDate: journal.accountingDate,
    periodKey: journal.periodKey,
    financialYearKey: journal.financialYearKey,
    sourceType: journal.sourceType,
    sourceId: journal.sourceId,
    memo: journal.memo,
    reversalOfJournalId: journal.reversalOfJournalId,
    postedAt: journal.postedAt,
    totalDebits: totals.debit,
    totalCredits: totals.credit,
    lineCount: journal.lines.length,
  };
}

export function createMemoryJournalRepository(): JournalRepository & {
  listPosted(): PostedJournal[];
} {
  const journals: PostedJournal[] = [];
  return {
    listPosted() {
      return journals.map(cloneJournal);
    },
    async insertPosted(input) {
      if (input.reversalOfJournalId) {
        const duplicate = journals.some(
          (journal) =>
            journal.tenantId === input.tenantId &&
            journal.reversalOfJournalId === input.reversalOfJournalId
        );
        if (duplicate) {
          throw new DuplicateReversalError();
        }
      }
      const postedAt = new Date();
      const id = crypto.randomUUID();
      const journal = freezeJournal({
        id,
        tenantId: input.tenantId,
        accountingDate: input.accountingDate,
        periodKey: input.periodKey,
        financialYearKey: input.financialYearKey,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        memo: input.memo,
        reversalOfJournalId: input.reversalOfJournalId,
        postedAt,
        lines: input.lines.map((line) => ({
          ...line,
          id: crypto.randomUUID(),
        })),
      });
      journals.push(journal);
      return cloneJournal(journal);
    },
    async findById(tenantId, journalId) {
      const match = journals.find(
        (journal) => journal.tenantId === tenantId && journal.id === journalId
      );
      return match ? cloneJournal(match) : null;
    },
    async listJournals(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      const limit = filter.limit ?? 1000;
      const offset = filter.offset ?? 0;

      return journals
        .filter((journal) => journal.tenantId === filter.tenantId)
        .filter((journal) => {
          if (filter.periodKey && journal.periodKey !== filter.periodKey) {
            return false;
          }
          if (filter.fromDate && journal.accountingDate < filter.fromDate) {
            return false;
          }
          if (filter.toDate && journal.accountingDate > filter.toDate) {
            return false;
          }
          if (!query) {
            return true;
          }
          return (
            journal.memo?.toLowerCase().includes(query) ||
            journal.sourceType.toLowerCase().includes(query) ||
            journal.id.toLowerCase().includes(query)
          );
        })
        .sort(
          (a, b) =>
            b.accountingDate.localeCompare(a.accountingDate) ||
            b.postedAt.getTime() - a.postedAt.getTime() ||
            a.id.localeCompare(b.id)
        )
        .slice(offset, offset + limit)
        .map((journal) => toSummary(cloneJournal(journal)));
    },
    async listLedgerLines(query) {
      const limit = query.limit ?? 10000;
      const offset = query.offset ?? 0;

      const rows: Array<
        Omit<LedgerLine, "balance" | "accountCode" | "accountName">
      > = [];
      for (const journal of journals) {
        if (journal.tenantId !== query.tenantId) {
          continue;
        }
        if (query.periodKey && journal.periodKey !== query.periodKey) {
          continue;
        }
        if (query.fromDate && journal.accountingDate < query.fromDate) {
          continue;
        }
        if (query.toDate && journal.accountingDate > query.toDate) {
          continue;
        }
        for (const line of journal.lines) {
          if (line.accountId !== query.accountId) {
            continue;
          }
          rows.push({
            journalId: journal.id,
            journalLineId: line.id,
            accountingDate: journal.accountingDate,
            periodKey: journal.periodKey,
            accountId: line.accountId,
            memo: journal.memo,
            description: line.description ?? null,
            sourceType: journal.sourceType,
            debit: line.debit,
            credit: line.credit,
          });
        }
      }
      return rows
        .sort(
          (a, b) =>
            a.accountingDate.localeCompare(b.accountingDate) ||
            a.journalId.localeCompare(b.journalId) ||
            a.journalLineId.localeCompare(b.journalLineId)
        )
        .slice(offset, offset + limit);
    },
    async trialBalanceForPeriod(tenantId, periodKey) {
      const byAccount = new Map<string, { debit: Money; credit: Money }>();
      for (const journal of journals) {
        if (journal.tenantId !== tenantId || journal.periodKey !== periodKey) {
          continue;
        }
        for (const line of journal.lines) {
          const current = byAccount.get(line.accountId) ?? {
            debit: money(0n),
            credit: money(0n),
          };
          byAccount.set(line.accountId, {
            debit: addMoney(current.debit, line.debit),
            credit: addMoney(current.credit, line.credit),
          });
        }
      }
      return [...byAccount.entries()].map(([accountId, totals]) => ({
        accountId,
        debitTotal: totals.debit,
        creditTotal: totals.credit,
      }));
    },
    async accountTotals(tenantId, accountIds, currency) {
      if (accountIds.length === 0) {
        return [];
      }
      const wanted = new Set(accountIds);
      const byAccount = new Map<string, { debit: Money; credit: Money }>();
      let scale: number | undefined;
      for (const journal of journals) {
        if (journal.tenantId !== tenantId) {
          continue;
        }
        for (const line of journal.lines) {
          if (!wanted.has(line.accountId)) {
            continue;
          }
          if (scale === undefined) {
            scale = line.debit.scale;
          }
          if (line.debit.scale !== scale || line.credit.scale !== scale) {
            throw new Error(
              `Scale mismatch: ${line.debit.scale} vs ${scale}`
            );
          }
          const zero = money(0n, currency, scale);
          const current = byAccount.get(line.accountId) ?? {
            debit: zero,
            credit: zero,
          };
          const debit = money(line.debit.amountMinor, currency, scale);
          const credit = money(line.credit.amountMinor, currency, scale);
          byAccount.set(line.accountId, {
            debit: addMoney(current.debit, debit),
            credit: addMoney(current.credit, credit),
          });
        }
      }
      return [...byAccount.entries()].map(([accountId, totals]) => ({
        accountId,
        debitTotal: totals.debit,
        creditTotal: totals.credit,
      }));
    },
    async findReversalOf(tenantId, originalJournalId) {
      const match = journals.find(
        (journal) =>
          journal.tenantId === tenantId &&
          journal.reversalOfJournalId === originalJournalId
      );
      return match ? cloneJournal(match) : null;
    },
  };
}

function cloneJournal(journal: PostedJournal): PostedJournal {
  return {
    ...journal,
    postedAt: new Date(journal.postedAt.getTime()),
    lines: journal.lines.map((line) => ({
      ...line,
      debit: { ...line.debit },
      credit: { ...line.credit },
    })),
  };
}

function freezeJournal(journal: PostedJournal): PostedJournal {
  const frozen = cloneJournal(journal);
  for (const line of frozen.lines) {
    Object.freeze(line.debit);
    Object.freeze(line.credit);
    Object.freeze(line);
  }
  Object.freeze(frozen.lines);
  return Object.freeze(frozen);
}

export type { TrialBalance };
