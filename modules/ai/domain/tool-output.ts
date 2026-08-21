import type { MoneyView } from "@/modules/ai/schemas/ai-tool.schema";
import { toMajorString, type Money } from "@/modules/shared-kernel/money";

/**
 * Money crosses the tool boundary as an exact decimal string so the model never
 * sees (or has to re-derive) a floating-point amount.
 */
export function toMoneyView(value: Money): MoneyView {
  return { amountMajor: toMajorString(value), currency: value.currency };
}

export function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDate}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}
