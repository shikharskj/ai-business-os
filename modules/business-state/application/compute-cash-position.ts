import {
  CASH_POSITION_ACCOUNT_CODES,
  cashPositionAccountFactId,
  cashPositionAccountName,
  isCashPositionAccountCode,
} from "@/modules/accounting/domain/cash-accounts";
import { ACCOUNT_CODES } from "@/modules/accounting/domain/types";
import type {
  AccountRepository,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import type {
  CashPositionAccountBalance,
  CashPositionSnapshot,
} from "@/modules/business-state/domain/types";
import {
  addMoney,
  money,
  subtractMoney,
  type Money,
} from "@/modules/shared-kernel/money";

/**
 * Cash position from designated cash/bank ledger balances.
 * Does not read invoices, allocations, or payment document tables.
 */
export async function computeCashPosition(input: {
  tenantId: string;
  currency: string;
  accounts: AccountRepository;
  journals: JournalRepository;
}): Promise<CashPositionSnapshot> {
  const currency = input.currency;
  const chart = await input.accounts.listForTenant(input.tenantId);
  const designated = chart.filter(
    (account) =>
      account.tenantId === input.tenantId &&
      isCashPositionAccountCode(account.code)
  );
  const totals =
    designated.length === 0
      ? []
      : await input.journals.accountTotals(
          input.tenantId,
          designated.map((account) => account.id),
          currency
        );
  const totalsByAccountId = new Map(
    totals.map((row) => [row.accountId, row])
  );
  const ledgerScale = totals[0]?.debitTotal.scale ?? 2;
  const zero = money(0n, currency, ledgerScale);

  function inTenantCurrency(value: Money): Money {
    return money(value.amountMinor, currency, ledgerScale);
  }

  function balanceForCode(code: string): Money {
    const account = designated.find((row) => row.code === code);
    if (!account) {
      return zero;
    }
    const totalsRow = totalsByAccountId.get(account.id);
    if (!totalsRow) {
      return zero;
    }
    // Cash and bank are DEBIT-normal assets: balance = debit − credit.
    // Ledger amounts have no stored currency; express them in the tenant
    // currency so an inactive Cash/Bank zero can be added to a live total.
    return subtractMoney(
      inTenantCurrency(totalsRow.debitTotal),
      inTenantCurrency(totalsRow.creditTotal)
    );
  }

  const cashBalance = balanceForCode(ACCOUNT_CODES.CASH);
  const bankBalance = balanceForCode(ACCOUNT_CODES.BANK);
  const total = addMoney(cashBalance, bankBalance);

  const accounts: CashPositionAccountBalance[] = CASH_POSITION_ACCOUNT_CODES.map(
    (code) => {
      const account = designated.find((row) => row.code === code);
      return {
        accountCode: code,
        accountName: cashPositionAccountName(code, account?.name),
        balance: balanceForCode(code),
        factId: cashPositionAccountFactId(code),
      };
    }
  );

  return {
    tenantId: input.tenantId,
    cashBalance,
    bankBalance,
    total,
    currency,
    scale: zero.scale,
    accounts,
    computedAt: new Date(),
  };
}
