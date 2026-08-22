import {
  attentionItemToDto,
  type AttentionItemDto,
} from "@/modules/business-state/application/dto";
import {
  briefActionsForAttentionType,
  type BriefRowAction,
} from "@/modules/business-state/application/brief-actions";
import type { AttentionItem } from "@/modules/business-state/domain/types";
import type { DashboardOverview } from "@/modules/reporting/domain/dashboard-types";
import {
  hourInTimezone,
  type BusinessDate,
} from "@/modules/shared-kernel/dates";
import { formatINR } from "@/modules/shared-kernel/format-money";
import { toMajorString, type Money } from "@/modules/shared-kernel/money";

export const ATTENTION_TYPE_LABELS = {
  OVERDUE_RECEIVABLE: "Overdue",
  LOW_STOCK: "Low stock",
  IDLE_QUOTATION: "Idle quote",
} as const;

export const ATTENTION_RECORD_LABELS: Record<string, string> = {
  SalesInvoice: "View invoice",
  Product: "View stock",
  Quotation: "View quotation",
};

export type DailyBriefMoneyDto = {
  amount: string;
  currency: string;
  scale: number;
};

export type DailyBriefCounts = {
  overdue: number;
  lowStock: number;
  idleQuotation: number;
};

export type DailyBriefPeriodNote = {
  id: string;
  title: string;
  detail: string;
  href?: string;
};

export type DailyBriefItemDto = AttentionItemDto & {
  actions: BriefRowAction[];
};

export type DailyBriefView = {
  greeting: string | null;
  yesterday: BusinessDate;
  snapshot: {
    sales: DailyBriefMoneyDto;
    collections: DailyBriefMoneyDto;
    expenses: DailyBriefMoneyDto;
  };
  counts: DailyBriefCounts;
  periodNotes: DailyBriefPeriodNote[];
  items: DailyBriefItemDto[];
};

function moneySnapshot(value: Money): DailyBriefMoneyDto {
  return {
    amount: toMajorString(value),
    currency: value.currency,
    scale: value.scale,
  };
}

function formatMoneyLabel(value: Money): string {
  if (value.currency === "INR") {
    return formatINR(value);
  }
  return `${value.currency} ${toMajorString(value)}`;
}

export function greetingForHour(
  hour: number,
  recipientName?: string | null
): string {
  const base =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = recipientName?.trim();
  if (name) {
    return `${base}, ${name} 🙂`;
  }
  return `${base} 🙂`;
}

export function countOpenAttentionByType(
  items: Array<Pick<AttentionItem, "type"> | Pick<AttentionItemDto, "type">>
): DailyBriefCounts {
  let overdue = 0;
  let lowStock = 0;
  let idleQuotation = 0;
  for (const item of items) {
    if (item.type === "OVERDUE_RECEIVABLE") overdue += 1;
    else if (item.type === "LOW_STOCK") lowStock += 1;
    else if (item.type === "IDLE_QUOTATION") idleQuotation += 1;
  }
  return { overdue, lowStock, idleQuotation };
}

/**
 * Period notes that Alerts used to show when they were not overdue/stock work
 * items. Deterministic from overview money — no client math, no queue dismiss.
 */
export function buildDailyBriefPeriodNotes(
  overview: Pick<
    DashboardOverview,
    "revenue" | "expenses" | "profit" | "receivables" | "payables"
  >
): DailyBriefPeriodNote[] {
  const notes: DailyBriefPeriodNote[] = [];
  const { revenue, expenses, profit, receivables, payables } = overview;

  if (profit.amountMinor < 0n) {
    notes.push({
      id: "note.profit-negative",
      title: "Expenses exceed sales",
      detail:
        "Profit is negative for this period. Review large expense categories and overdue collections.",
      href: "/app/reports/profit",
    });
  } else if (revenue.amountMinor > 0n && expenses.amountMinor > 0n) {
    if (expenses.amountMinor * 100n > revenue.amountMinor * 85n) {
      const percentageTimes100 =
        (expenses.amountMinor * 10000n) / revenue.amountMinor;
      const roundedPercentage = Number((percentageTimes100 + 50n) / 100n);
      notes.push({
        id: "note.high-expense-ratio",
        title: "High expense ratio",
        detail: `Expenses are ${roundedPercentage}% of taxable sales this period.`,
        href: "/app/reports/expenses",
      });
    }
  }

  if (
    payables.amountMinor > receivables.amountMinor * 2n &&
    payables.amountMinor > 0n
  ) {
    notes.push({
      id: "note.payables-heavy",
      title: "Payables outweigh receivables",
      detail: `Supplier balances (${formatMoneyLabel(payables)}) are high relative to receivables (${formatMoneyLabel(receivables)}).`,
      href: "/app/purchases/bills",
    });
  }

  return notes;
}

/**
 * Operator Daily Brief DTO. Copy is deterministic; `quiet` drops the greeting
 * when the AI supervisor is unavailable (same rows, quieter header).
 */
export function buildDailyBriefView(input: {
  timezone: string;
  now?: Date;
  quiet: boolean;
  /** First name (or display name) for the personalized greeting. */
  recipientName?: string | null;
  yesterday: BusinessDate;
  sales: Money;
  collections: Money;
  expenses: Money;
  items: AttentionItem[];
  overview?: Pick<
    DashboardOverview,
    "revenue" | "expenses" | "profit" | "receivables" | "payables"
  > | null;
}): DailyBriefView {
  return {
    greeting: input.quiet
      ? null
      : greetingForHour(
          hourInTimezone(input.timezone, input.now),
          input.recipientName
        ),
    yesterday: input.yesterday,
    snapshot: {
      sales: moneySnapshot(input.sales),
      collections: moneySnapshot(input.collections),
      expenses: moneySnapshot(input.expenses),
    },
    counts: countOpenAttentionByType(input.items),
    periodNotes: input.overview
      ? buildDailyBriefPeriodNotes(input.overview)
      : [],
    items: input.items.map((item) => ({
      ...attentionItemToDto(item),
      actions: briefActionsForAttentionType(item.type),
    })),
  };
}
