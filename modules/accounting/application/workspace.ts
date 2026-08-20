import { AccountingError, JournalNotFoundError } from "@/modules/accounting/domain/errors";
import {
  assertCanClosePeriod,
  currentPeriodKey,
  isPeriodClosed,
} from "@/modules/accounting/domain/period-close";
import type {
  JournalListFilter,
  JournalSummary,
  LedgerLine,
  PeriodStatus,
  TrialBalance,
} from "@/modules/accounting/domain/workspace-types";
import type { Account, PostedJournal } from "@/modules/accounting/domain/types";
import type {
  AccountRepository,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import type { BusinessRepository } from "@/modules/tenant/infrastructure/repositories";
import type { AuditRepository } from "@/modules/shared-kernel/audit";
import type { OutboxRepository } from "@/modules/shared-kernel/outbox";
import { businessDate, type BusinessDate } from "@/modules/shared-kernel/dates";
import { addMoney, money, subtractMoney } from "@/modules/shared-kernel/money";
import { postJournal } from "@/modules/accounting/application/post-journal";
import { reverseJournal as reverseJournalCore } from "@/modules/accounting/application/reverse-journal";
import { ensureChartOfAccounts } from "@/modules/accounting/application/seed-chart";
import type { JournalLineDraft } from "@/modules/accounting/domain/types";

export async function listChartOfAccounts(input: {
  tenantId: string;
  accounts: AccountRepository;
}): Promise<Account[]> {
  return input.accounts.listForTenant(input.tenantId);
}

export async function listJournals(input: {
  filter: JournalListFilter;
  journals: JournalRepository;
}): Promise<JournalSummary[]> {
  return input.journals.listJournals(input.filter);
}

export async function getJournal(input: {
  tenantId: string;
  journalId: string;
  journals: JournalRepository;
}): Promise<PostedJournal> {
  const journal = await input.journals.findById(input.tenantId, input.journalId);
  if (!journal) {
    throw new JournalNotFoundError(input.journalId);
  }
  return journal;
}

export async function getLedger(input: {
  tenantId: string;
  accountId: string;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
  periodKey?: string;
  accounts: AccountRepository;
  journals: JournalRepository;
}): Promise<{ account: Account; lines: LedgerLine[] }> {
  const account = await input.accounts.findById(input.tenantId, input.accountId);
  if (!account) {
    throw new AccountingError("Account was not found.");
  }

  const raw = await input.journals.listLedgerLines({
    tenantId: input.tenantId,
    accountId: input.accountId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    periodKey: input.periodKey,
  });

  const periodStart = input.periodKey ? businessDate(`${input.periodKey}-01`) : undefined;
  const effectiveFromDate = input.fromDate ?? periodStart;

  let running = money(0n);
  if (effectiveFromDate) {
    const openingLines = await input.journals.listLedgerLines({
      tenantId: input.tenantId,
      accountId: input.accountId,
      toDate: businessDate(
        new Date(new Date(effectiveFromDate).getTime() - 86400000).toISOString().split("T")[0]!
      ),
    });

    for (const row of openingLines) {
      const delta =
        account.normalBalance === "DEBIT"
          ? subtractMoney(row.debit, row.credit)
          : subtractMoney(row.credit, row.debit);
      running = addMoney(running, delta);
    }
  }

  const lines: LedgerLine[] = raw.map((row) => {
    const delta =
      account.normalBalance === "DEBIT"
        ? subtractMoney(row.debit, row.credit)
        : subtractMoney(row.credit, row.debit);
    running = addMoney(running, delta);
    return {
      ...row,
      accountCode: account.code,
      accountName: account.name,
      balance: running,
    };
  });

  return { account, lines };
}

export async function getTrialBalance(input: {
  tenantId: string;
  periodKey: string;
  accounts: AccountRepository;
  journals: JournalRepository;
}): Promise<TrialBalance> {
  const [accounts, aggregates] = await Promise.all([
    input.accounts.listForTenant(input.tenantId),
    input.journals.trialBalanceForPeriod(input.tenantId, input.periodKey),
  ]);
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const rows = aggregates
    .map((row) => {
      const account = accountById.get(row.accountId);
      if (!account) {
        return null;
      }
      return {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        normalBalance: account.normalBalance,
        debitTotal: row.debitTotal,
        creditTotal: row.creditTotal,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalDebits = rows.reduce(
    (sum, row) => addMoney(sum, row.debitTotal),
    money(0n)
  );
  const totalCredits = rows.reduce(
    (sum, row) => addMoney(sum, row.creditTotal),
    money(0n)
  );

  return {
    periodKey: input.periodKey,
    rows,
    totalDebits,
    totalCredits,
    isBalanced: totalDebits.amountMinor === totalCredits.amountMinor,
  };
}

export function getPeriodStatus(input: {
  today: BusinessDate;
  closedThroughPeriodKey: string | null;
}): PeriodStatus {
  const current = currentPeriodKey(input.today);
  return {
    currentPeriodKey: current,
    closedThroughPeriodKey: input.closedThroughPeriodKey,
    currentPeriodClosed: isPeriodClosed(current, input.closedThroughPeriodKey),
  };
}

export async function closeAccountingPeriod(input: {
  tenantId: string;
  actorUserId: string;
  periodKey: string;
  today: BusinessDate;
  businesses: BusinessRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}) {
  const business = await input.businesses.findById(input.tenantId);
  if (!business) {
    throw new AccountingError("Business was not found.");
  }

  const current = currentPeriodKey(input.today);
  assertCanClosePeriod({
    periodKey: input.periodKey,
    closedThroughPeriodKey: business.closedThroughPeriodKey,
    currentPeriodKey: current,
  });

  const previousClosedThrough = business.closedThroughPeriodKey;

  const updated = await input.businesses.setClosedThroughPeriodKey(
    input.tenantId,
    input.periodKey
  );

  const rereadBusiness = await input.businesses.findById(input.tenantId);
  if (!rereadBusiness || rereadBusiness.closedThroughPeriodKey !== input.periodKey) {
    throw new AccountingError(
      "Period close conflict detected. Another user may have closed a different period concurrently. Please refresh and try again."
    );
  }

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "accounting.period_closed",
    resource: "accounting_period",
    resourceId: input.periodKey,
    metadata: {
      periodKey: input.periodKey,
      previousClosedThrough,
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "AccountingPeriodClosed",
    aggregateType: "Business",
    aggregateId: input.tenantId,
    payload: {
      periodKey: input.periodKey,
      closedThroughPeriodKey: updated.closedThroughPeriodKey,
    },
  });

  return updated;
}

export async function postAdjustmentJournal(input: {
  tenantId: string;
  actorUserId: string;
  accountingDate: BusinessDate;
  financialYearStartMonth: number;
  closedThroughPeriodKey: string | null;
  memo?: string | null;
  lines: JournalLineDraft[];
  accounts: AccountRepository;
  journals: JournalRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}): Promise<PostedJournal> {
  await ensureChartOfAccounts({
    tenantId: input.tenantId,
    accountRepository: input.accounts,
  });
  const sourceId = crypto.randomUUID();
  const journal = await postJournal({
    tenantId: input.tenantId,
    accountingDate: input.accountingDate,
    financialYearStartMonth: input.financialYearStartMonth,
    closedThroughPeriodKey: input.closedThroughPeriodKey,
    sourceType: "Adjustment",
    sourceId,
    memo: input.memo?.trim() ? input.memo.trim() : "Manual adjustment",
    lines: input.lines,
    accountRepository: input.accounts,
    journalRepository: input.journals,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "accounting.adjustment_posted",
    resource: "journal",
    resourceId: journal.id,
    metadata: {
      sourceType: journal.sourceType,
      periodKey: journal.periodKey,
      lineCount: journal.lines.length,
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "JournalPosted",
    aggregateType: "Journal",
    aggregateId: journal.id,
    payload: {
      sourceType: journal.sourceType,
      sourceId: journal.sourceId,
      periodKey: journal.periodKey,
    },
  });

  return journal;
}

export async function reversePostedJournal(input: {
  tenantId: string;
  actorUserId: string;
  journalId: string;
  accountingDate: BusinessDate;
  financialYearStartMonth: number;
  closedThroughPeriodKey: string | null;
  accounts: AccountRepository;
  journals: JournalRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}): Promise<PostedJournal> {
  const reversal = await reverseJournalCore({
    tenantId: input.tenantId,
    journalId: input.journalId,
    accountingDate: input.accountingDate,
    financialYearStartMonth: input.financialYearStartMonth,
    closedThroughPeriodKey: input.closedThroughPeriodKey,
    accountRepository: input.accounts,
    journalRepository: input.journals,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "accounting.journal_reversed",
    resource: "journal",
    resourceId: reversal.id,
    metadata: {
      originalJournalId: input.journalId,
      periodKey: reversal.periodKey,
    },
  });

  await input.outbox.persist({
    tenantId: input.tenantId,
    eventType: "JournalReversed",
    aggregateType: "Journal",
    aggregateId: reversal.id,
    payload: {
      originalJournalId: input.journalId,
      reversalJournalId: reversal.id,
      periodKey: reversal.periodKey,
    },
  });

  return reversal;
}
