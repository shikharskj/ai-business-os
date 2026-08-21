import type {
  AccountRepository,
  JournalRepository,
} from "@/modules/accounting/infrastructure/repositories";
import { computeCashPosition } from "@/modules/business-state/application/compute-cash-position";
import type { CashPositionSnapshot } from "@/modules/business-state/domain/types";

/**
 * Authoritative cash-position query: ledger balances of designated cash/bank
 * accounts. AI and APIs must use this (or the CashPosition projection built
 * from it) — never unpaid invoice totals.
 *
 * Caller must enforce authz (`report:read`) and pass the authorized tenantId.
 */
export async function getCashPosition(input: {
  tenantId: string;
  currency: string;
  accounts: AccountRepository;
  journals: JournalRepository;
}): Promise<CashPositionSnapshot> {
  return computeCashPosition(input);
}
