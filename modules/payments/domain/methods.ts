import { ACCOUNT_CODES } from "@/modules/accounting/domain/types";
import type { PaymentMethod } from "@/modules/payments/domain/types";

/**
 * Maps a payment method onto a designated cash-position COA account.
 *
 * Cash position is ledger balances of Cash (1000) and Bank (1010). Customer
 * receipts, supplier payments, and expenses post through this mapping so the
 * projection cannot invent cash from invoice tables.
 *
 * - CASH → Cash (1000)
 * - UPI, BANK_TRANSFER, CARD, CHEQUE → Bank (1010)
 */
export function cashAccountCodeForMethod(method: PaymentMethod): string {
  return method === "CASH" ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK;
}
