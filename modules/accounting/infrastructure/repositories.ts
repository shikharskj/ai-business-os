import type { BusinessDate } from "@/modules/shared-kernel/dates";

import { DuplicateReversalError } from "@/modules/accounting/domain/errors";
import type { Account, PostedJournal } from "@/modules/accounting/domain/types";
import type { JournalLineDraft } from "@/modules/accounting/domain/types";

export type AccountRepository = {
  listForTenant(tenantId: string): Promise<Account[]>;
  findByCode(tenantId: string, code: string): Promise<Account | null>;
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
};

export function createMemoryAccountRepository(
  initial: Account[] = []
): AccountRepository & { accounts: Account[] } {
  const accounts = [...initial];
  return {
    accounts,
    async listForTenant(tenantId) {
      return accounts.filter((account) => account.tenantId === tenantId);
    },
    async findByCode(tenantId, code) {
      return (
        accounts.find(
          (account) => account.tenantId === tenantId && account.code === code
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
