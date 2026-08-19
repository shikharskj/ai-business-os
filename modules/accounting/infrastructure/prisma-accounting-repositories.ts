import "server-only";

import { prisma } from "@/lib/db";
import { businessDate } from "@/modules/shared-kernel/dates";
import {
  moneyFromPrismaDecimal,
  toDecimalForPrisma,
} from "@/modules/shared-kernel/money";
import type { Account, PostedJournal } from "@/modules/accounting/domain/types";
import type {
  AccountRepository,
  JournalInsert,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";

function mapAccount(row: {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: Account["type"];
  normalBalance: Account["normalBalance"];
}): Account {
  return {
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    type: row.type,
    normalBalance: row.normalBalance,
  };
}

function mapJournal(row: {
  id: string;
  tenantId: string;
  accountingDate: string;
  periodKey: string;
  financialYearKey: string;
  sourceType: string;
  sourceId: string;
  memo: string | null;
  reversalOfJournalId: string | null;
  postedAt: Date;
  lines: Array<{
    id: string;
    description: string | null;
    debit: { toString(): string };
    credit: { toString(): string };
    accountId: string;
    account: { code: string };
  }>;
}): PostedJournal {
  return {
    id: row.id,
    tenantId: row.tenantId,
    accountingDate: businessDate(row.accountingDate),
    periodKey: row.periodKey,
    financialYearKey: row.financialYearKey,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    memo: row.memo,
    reversalOfJournalId: row.reversalOfJournalId,
    postedAt: row.postedAt,
    lines: row.lines.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      accountCode: line.account.code,
      description: line.description ?? undefined,
      debit: moneyFromPrismaDecimal(line.debit),
      credit: moneyFromPrismaDecimal(line.credit),
    })),
  };
}

export const prismaAccountRepository: AccountRepository = {
  async listForTenant(tenantId) {
    const rows = await prisma.account.findMany({ where: { tenantId } });
    return rows.map(mapAccount);
  },
  async findByCode(tenantId, code) {
    const row = await prisma.account.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    return row ? mapAccount(row) : null;
  },
  async ensureChartAccounts(accounts) {
    if (accounts.length === 0) {
      return [];
    }
    await prisma.account.createMany({
      data: accounts.map((account) => ({
        tenantId: account.tenantId,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
      })),
      skipDuplicates: true,
    });
    const tenantId = accounts[0]!.tenantId;
    const codes = accounts.map((account) => account.code);
    const rows = await prisma.account.findMany({
      where: { tenantId, code: { in: codes } },
    });
    return rows.map(mapAccount);
  },
};

export const prismaJournalRepository: JournalRepository = {
  async insertPosted(input: JournalInsert) {
    const row = await prisma.$transaction(async (tx) => {
      const journal = await tx.journal.create({
        data: {
          tenantId: input.tenantId,
          accountingDate: input.accountingDate,
          periodKey: input.periodKey,
          financialYearKey: input.financialYearKey,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          memo: input.memo,
          reversalOfJournalId: input.reversalOfJournalId,
          lines: {
            create: input.lines.map((line) => ({
              tenantId: input.tenantId,
              accountId: line.accountId,
              description: line.description ?? null,
              debit: toDecimalForPrisma(line.debit),
              credit: toDecimalForPrisma(line.credit),
            })),
          },
        },
        include: { lines: { include: { account: true } } },
      });
      return journal;
    });
    return mapJournal(row);
  },
  async findById(tenantId, journalId) {
    const row = await prisma.journal.findFirst({
      where: { id: journalId, tenantId },
      include: { lines: { include: { account: true } } },
    });
    return row ? mapJournal(row) : null;
  },
};
