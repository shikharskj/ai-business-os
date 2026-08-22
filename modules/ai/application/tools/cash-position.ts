import { defineAiTool } from "@/modules/ai/domain/define-tool";
import { toMoneyView } from "@/modules/ai/domain/tool-output";
import {
  cashPositionInputSchema,
  cashPositionOutputSchema,
} from "@/modules/ai/schemas/ai-tool.schema";
import { getCashPosition } from "@/modules/business-state";
import type { Money } from "@/modules/shared-kernel/money";

function moneyFact(value: Money, factId: string) {
  return {
    ...toMoneyView(value),
    scale: value.scale,
    factId,
  };
}

export const cashPositionTool = defineAiTool({
  name: "get_cash_position",
  description:
    "Current cash position from ledger Cash and Bank account balances. Use this for any cash-on-hand question. Do not infer cash from unpaid invoices or period receipts.",
  category: "read",
  permission: "report:read",
  autonomyLevel: "L0",
  inputSchema: cashPositionInputSchema,
  outputSchema: cashPositionOutputSchema,
  async execute(_input, context) {
    const snapshot = await getCashPosition({
      tenantId: context.tenantId,
      currency: context.currency,
      accounts: context.repositories.accounts,
      journals: context.repositories.journals,
    });

    return {
      total: moneyFact(snapshot.total, "cash-position:total"),
      cash: moneyFact(snapshot.cashBalance, "cash-position:cash"),
      bank: moneyFact(snapshot.bankBalance, "cash-position:bank"),
      currency: snapshot.currency,
      scale: snapshot.scale,
      accounts: snapshot.accounts.map((account) => ({
        accountCode: account.accountCode,
        accountName: account.accountName,
        balance: moneyFact(account.balance, account.factId),
      })),
      computedAt: snapshot.computedAt.toISOString(),
    };
  },
});
