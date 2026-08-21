import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { businessDate } from "@/modules/shared-kernel/dates";
import {
  money,
  moneyFromPrismaDecimal,
  toDecimalForPrisma,
} from "@/modules/shared-kernel/money";
import type { Account, PostedJournal } from "@/modules/accounting/domain/types";
import type {
  AccountRepository,
  JournalInsert,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import type { JournalListFilter } from "@/modules/accounting/domain/workspace-types";

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

const journalInclude = {
  lines: { include: { account: true } },
} as const;

export function createPrismaAccountRepository(
  client: Pick<PrismaClient, "account"> = prisma
): AccountRepository {
  return {
    async listForTenant(tenantId) {
      const rows = await client.account.findMany({
        where: { tenantId },
        orderBy: { code: "asc" },
      });
      return rows.map(mapAccount);
    },
    async findByCode(tenantId, code) {
      const row = await client.account.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });
      return row ? mapAccount(row) : null;
    },
    async findById(tenantId, accountId) {
      const row = await client.account.findFirst({
        where: { id: accountId, tenantId },
      });
      return row ? mapAccount(row) : null;
    },
    async ensureChartAccounts(accounts) {
      if (accounts.length === 0) {
        return [];
      }
      await client.account.createMany({
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
      const rows = await client.account.findMany({
        where: { tenantId, code: { in: codes } },
      });
      return rows.map(mapAccount);
    },
  };
}

export const prismaAccountRepository = createPrismaAccountRepository(prisma);

export function createPrismaJournalRepository(
  client: Pick<PrismaClient, "journal" | "journalLine"> = prisma
): JournalRepository {
  return {
    async insertPosted(input: JournalInsert) {
      const journal = await client.journal.create({
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
        include: journalInclude,
      });
      return mapJournal(journal);
    },
    async findById(tenantId, journalId) {
      const row = await client.journal.findFirst({
        where: { id: journalId, tenantId },
        include: journalInclude,
      });
      return row ? mapJournal(row) : null;
    },
    async listJournals(filter: JournalListFilter) {
      const query = filter.query?.trim();
      const where: Prisma.JournalWhereInput = {
        tenantId: filter.tenantId,
        ...(filter.periodKey ? { periodKey: filter.periodKey } : {}),
        ...(filter.fromDate || filter.toDate
          ? {
              accountingDate: {
                ...(filter.fromDate ? { gte: filter.fromDate } : {}),
                ...(filter.toDate ? { lte: filter.toDate } : {}),
              },
            }
          : {}),
        ...(query
          ? {
              OR: [
                { memo: { contains: query, mode: "insensitive" } },
                { sourceType: { contains: query, mode: "insensitive" } },
                { id: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const limit = filter.limit ?? 1000;
      const offset = filter.offset ?? 0;

      const rows = await client.journal.findMany({
        where,
        orderBy: [{ accountingDate: "desc" }, { postedAt: "desc" }, { id: "asc" }],
        take: limit,
        skip: offset,
      });

      const totals = await client.journalLine.groupBy({
        by: ["journalId"],
        where: {
          journalId: { in: rows.map((r) => r.id) },
        },
        _sum: { debit: true, credit: true },
        _count: { id: true },
      });

      const totalsMap = new Map(
        totals.map((t) => [
          t.journalId,
          {
            debit: t._sum.debit ? moneyFromPrismaDecimal(t._sum.debit) : money(0n),
            credit: t._sum.credit ? moneyFromPrismaDecimal(t._sum.credit) : money(0n),
            lineCount: t._count.id,
          },
        ])
      );

      return rows.map((row) => {
        const totalsData = totalsMap.get(row.id) ?? {
          debit: money(0n),
          credit: money(0n),
          lineCount: 0,
        };
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
          totalDebits: totalsData.debit,
          totalCredits: totalsData.credit,
          lineCount: totalsData.lineCount,
        };
      });
    },
    async listLedgerLines(query) {
      const limit = query.limit ?? 10000;
      const offset = query.offset ?? 0;

      const rows = await client.journalLine.findMany({
        where: {
          tenantId: query.tenantId,
          accountId: query.accountId,
          journal: {
            tenantId: query.tenantId,
            ...(query.periodKey ? { periodKey: query.periodKey } : {}),
            ...(query.fromDate || query.toDate
              ? {
                  accountingDate: {
                    ...(query.fromDate ? { gte: query.fromDate } : {}),
                    ...(query.toDate ? { lte: query.toDate } : {}),
                  },
                }
              : {}),
          },
        },
        include: {
          journal: true,
        },
        orderBy: [
          { journal: { accountingDate: "asc" } },
          { journalId: "asc" },
          { id: "asc" },
        ],
        take: limit,
        skip: offset,
      });
      return rows.map((row) => ({
        journalId: row.journalId,
        journalLineId: row.id,
        accountingDate: businessDate(row.journal.accountingDate),
        periodKey: row.journal.periodKey,
        accountId: row.accountId,
        memo: row.journal.memo,
        description: row.description,
        sourceType: row.journal.sourceType,
        debit: moneyFromPrismaDecimal(row.debit),
        credit: moneyFromPrismaDecimal(row.credit),
      }));
    },
    async trialBalanceForPeriod(tenantId, periodKey) {
      const grouped = await client.journalLine.groupBy({
        by: ["accountId"],
        where: {
          tenantId,
          journal: { tenantId, periodKey },
        },
        _sum: { debit: true, credit: true },
      });
      return grouped.map((row) => ({
        accountId: row.accountId,
        debitTotal: row._sum.debit
          ? moneyFromPrismaDecimal(row._sum.debit)
          : money(0n),
        creditTotal: row._sum.credit
          ? moneyFromPrismaDecimal(row._sum.credit)
          : money(0n),
      }));
    },
    async accountTotals(tenantId, accountIds) {
      if (accountIds.length === 0) {
        return [];
      }
      const grouped = await client.journalLine.groupBy({
        by: ["accountId"],
        where: {
          tenantId,
          accountId: { in: accountIds },
          journal: { tenantId },
        },
        _sum: { debit: true, credit: true },
      });
      return grouped.map((row) => ({
        accountId: row.accountId,
        debitTotal: row._sum.debit
          ? moneyFromPrismaDecimal(row._sum.debit)
          : money(0n),
        creditTotal: row._sum.credit
          ? moneyFromPrismaDecimal(row._sum.credit)
          : money(0n),
      }));
    },
    async findReversalOf(tenantId, originalJournalId) {
      const row = await client.journal.findFirst({
        where: { tenantId, reversalOfJournalId: originalJournalId },
        include: journalInclude,
      });
      return row ? mapJournal(row) : null;
    },
  };
}

export const prismaJournalRepository = createPrismaJournalRepository(prisma);
