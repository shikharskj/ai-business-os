import type { BusinessDate } from "@/modules/shared-kernel/dates";

import type { Account, PostedJournal } from "@/modules/accounting/domain/types";
import type { JournalLineDraft } from "@/modules/accounting/domain/types";

export type AccountRepository = {
  listForTenant(tenantId: string): Promise<Account[]>;
  findByCode(tenantId: string, code: string): Promise<Account | null>;
  insertMany(accounts: Omit<Account, "id">[]): Promise<Account[]>;
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
    async insertMany(rows) {
      const created = rows.map((row) => ({ ...row, id: crypto.randomUUID() }));
      accounts.push(...created);
      return created;
    },
  };
}

export function createMemoryJournalRepository(): JournalRepository & {
  journals: PostedJournal[];
} {
  const journals: PostedJournal[] = [];
  return {
    journals,
    async insertPosted(input) {
      const postedAt = new Date();
      const id = crypto.randomUUID();
      const journal: PostedJournal = {
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
      };
      journals.push(Object.freeze(journal) as PostedJournal);
      return journal;
    },
    async findById(tenantId, journalId) {
      return (
        journals.find(
          (journal) => journal.tenantId === tenantId && journal.id === journalId
        ) ?? null
      );
    },
  };
}
