import { ACCOUNT_CODES } from "@/modules/accounting/domain/types";
import type { PaymentMethod } from "@/modules/payments/domain/types";

/**
 * Cash receipts hit Cash. UPI, bank transfer, card, and cheque are
 * treated as bank receipts for the MVP chart of accounts.
 */
export function cashAccountCodeForMethod(method: PaymentMethod): string {
  return method === "CASH" ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK;
}
