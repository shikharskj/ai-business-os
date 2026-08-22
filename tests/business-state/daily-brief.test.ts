import { describe, expect, it } from "vitest";

import {
  ATTENTION_RECORD_LABELS,
  ATTENTION_TYPE_LABELS,
  buildDailyBriefPeriodNotes,
  buildDailyBriefView,
  countOpenAttentionByType,
  greetingForHour,
} from "@/modules/business-state/application/build-daily-brief";
import { briefActionsForAttentionType } from "@/modules/business-state/application/brief-actions";
import type { AttentionItem } from "@/modules/business-state/domain/types";
import { businessDate } from "@/modules/shared-kernel/dates";
import { money } from "@/modules/shared-kernel/money";

function itemFixture(
  overrides: Partial<AttentionItem> & Pick<AttentionItem, "id" | "type">
): AttentionItem {
  const now = new Date("2026-08-22T04:00:00.000Z");
  return {
    tenantId: "tenant-a",
    naturalKey: `key:${overrides.id}`,
    severity: 80,
    status: "OPEN",
    title: "Overdue invoice",
    body: "INV/1 is overdue.",
    href: "/app/sales/invoices/inv-1",
    resourceType: "SalesInvoice",
    resourceId: "inv-1",
    amount: money(1200_00n),
    currency: "INR",
    factId: "attention:overdue-receivable:inv-1",
    computedAt: now,
    dismissedAt: null,
    dismissedByUserId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("greetingForHour", () => {
  it("splits morning, afternoon, and evening", () => {
    expect(greetingForHour(0)).toBe("Good morning 🙂");
    expect(greetingForHour(11)).toBe("Good morning 🙂");
    expect(greetingForHour(12)).toBe("Good afternoon 🙂");
    expect(greetingForHour(16)).toBe("Good afternoon 🙂");
    expect(greetingForHour(17)).toBe("Good evening 🙂");
    expect(greetingForHour(23)).toBe("Good evening 🙂");
  });

  it("appends the recipient name when provided", () => {
    expect(greetingForHour(9, "Shikhar")).toBe("Good morning, Shikhar 🙂");
    expect(greetingForHour(14, "  Ada  ")).toBe("Good afternoon, Ada 🙂");
  });
});

describe("buildDailyBriefView", () => {
  const yesterday = businessDate("2026-08-21");
  const sales = money(10_00n);
  const collections = money(25_00n);
  const expenses = money(3_00n);

  it("copies yesterday totals from server money without inventing figures", () => {
    const view = buildDailyBriefView({
      timezone: "Asia/Kolkata",
      now: new Date("2026-08-22T02:00:00.000Z"),
      quiet: false,
      yesterday,
      sales,
      collections,
      expenses,
      items: [],
    });

    expect(view.yesterday).toBe("2026-08-21");
    expect(view.snapshot.sales).toEqual({
      amount: "10.00",
      currency: "INR",
      scale: 2,
    });
    expect(view.snapshot.collections.amount).toBe("25.00");
    expect(view.snapshot.expenses.amount).toBe("3.00");
    expect(view.greeting).toBe("Good morning 🙂");
    expect(view.counts).toEqual({
      overdue: 0,
      lowStock: 0,
      idleQuotation: 0,
    });
    expect(view.periodNotes).toEqual([]);
  });

  it("personalizes the greeting with recipientName", () => {
    const view = buildDailyBriefView({
      timezone: "Asia/Kolkata",
      now: new Date("2026-08-22T02:00:00.000Z"),
      quiet: false,
      recipientName: "Shikhar",
      yesterday,
      sales,
      collections,
      expenses,
      items: [],
    });
    expect(view.greeting).toBe("Good morning, Shikhar 🙂");
  });

  it("drops the greeting when AI is down", () => {
    const view = buildDailyBriefView({
      timezone: "Asia/Kolkata",
      now: new Date("2026-08-22T02:00:00.000Z"),
      quiet: true,
      yesterday,
      sales,
      collections,
      expenses,
      items: [],
      overview: {
        revenue: money(100_00n),
        expenses: money(95_00n),
        profit: money(5_00n),
        receivables: money(10_00n),
        payables: money(50_00n),
      },
    });
    expect(view.greeting).toBeNull();
    expect(view.items).toHaveLength(0);
    expect(view.periodNotes.map((n) => n.id)).toContain("note.payables-heavy");
  });

  it("keeps attention rank and verified amount facts", () => {
    const items = [
      itemFixture({
        id: "att-1",
        type: "OVERDUE_RECEIVABLE",
        severity: 90,
        title: "ABC Traders overdue",
      }),
      itemFixture({
        id: "att-2",
        type: "LOW_STOCK",
        severity: 50,
        title: "Rice is low",
        href: "/app/inventory/stock/prod-1",
        resourceType: "Product",
        resourceId: "prod-1",
        amount: null,
        currency: null,
        factId: null,
      }),
    ];

    const view = buildDailyBriefView({
      timezone: "Asia/Kolkata",
      quiet: true,
      yesterday,
      sales,
      collections,
      expenses,
      items,
    });

    expect(view.items.map((row) => row.id)).toEqual(["att-1", "att-2"]);
    expect(view.counts).toEqual({
      overdue: 1,
      lowStock: 1,
      idleQuotation: 0,
    });
    expect(view.items[0]?.actions.map((a) => a.label)).toEqual([
      "Remind customer",
      "Prepare reminder",
    ]);
    expect(view.items[1]?.actions.map((a) => a.label)).toEqual([
      "Review stock",
    ]);
    expect(view.items[0]?.href).toBe("/app/sales/invoices/inv-1");
    expect(view.items[0]?.amount).toMatchObject({
      amount: "1200.00",
      currency: "INR",
      factId: "attention:overdue-receivable:inv-1",
    });
    expect(ATTENTION_TYPE_LABELS.OVERDUE_RECEIVABLE).toBe("Overdue");
    expect(ATTENTION_RECORD_LABELS.SalesInvoice).toBe("View invoice");
  });
});

describe("countOpenAttentionByType", () => {
  it("tallies each attention type", () => {
    expect(
      countOpenAttentionByType([
        itemFixture({ id: "a", type: "OVERDUE_RECEIVABLE" }),
        itemFixture({ id: "b", type: "OVERDUE_RECEIVABLE" }),
        itemFixture({ id: "c", type: "LOW_STOCK" }),
        itemFixture({ id: "d", type: "IDLE_QUOTATION" }),
      ])
    ).toEqual({ overdue: 2, lowStock: 1, idleQuotation: 1 });
  });
});

describe("buildDailyBriefPeriodNotes", () => {
  it("flags negative profit", () => {
    const notes = buildDailyBriefPeriodNotes({
      revenue: money(100_00n),
      expenses: money(150_00n),
      profit: money(-50_00n),
      receivables: money(0n),
      payables: money(0n),
    });
    expect(notes.map((n) => n.id)).toEqual(["note.profit-negative"]);
    expect(notes[0]?.href).toBe("/app/reports/profit");
  });

  it("flags high expense ratio when profit is non-negative", () => {
    const notes = buildDailyBriefPeriodNotes({
      revenue: money(100_00n),
      expenses: money(90_00n),
      profit: money(10_00n),
      receivables: money(20_00n),
      payables: money(10_00n),
    });
    expect(notes).toHaveLength(1);
    expect(notes[0]?.id).toBe("note.high-expense-ratio");
    expect(notes[0]?.detail).toContain("90%");
  });

  it("flags payables outweighing receivables", () => {
    const notes = buildDailyBriefPeriodNotes({
      revenue: money(1000_00n),
      expenses: money(100_00n),
      profit: money(900_00n),
      receivables: money(100_00n),
      payables: money(250_00n),
    });
    expect(notes.map((n) => n.id)).toEqual(["note.payables-heavy"]);
    expect(notes[0]?.href).toBe("/app/purchases/bills");
    expect(notes[0]?.detail).toContain("₹250.00");
  });

  it("omits notes when ratios are healthy", () => {
    expect(
      buildDailyBriefPeriodNotes({
        revenue: money(1000_00n),
        expenses: money(100_00n),
        profit: money(900_00n),
        receivables: money(500_00n),
        payables: money(100_00n),
      })
    ).toEqual([]);
  });

  it("does not emit period-summary or open-receivables style notes", () => {
    const notes = buildDailyBriefPeriodNotes({
      revenue: money(1000_00n),
      expenses: money(100_00n),
      profit: money(900_00n),
      receivables: money(500_00n),
      payables: money(100_00n),
    });
    expect(notes.every((n) => !n.id.includes("period-summary"))).toBe(true);
    expect(notes.every((n) => !n.id.includes("receivables"))).toBe(true);
  });
});

describe("briefActionsForAttentionType", () => {
  it("maps overdue to remind + prepare reminder", () => {
    const actions = briefActionsForAttentionType("OVERDUE_RECEIVABLE");
    expect(actions.map((a) => a.kind)).toEqual(["recommend", "prepare"]);
    expect(actions[1]?.prepareToolName).toBe("send_payment_reminders");
  });

  it("maps low stock and idle quote to recommend only", () => {
    expect(briefActionsForAttentionType("LOW_STOCK").map((a) => a.label)).toEqual([
      "Review stock",
    ]);
    expect(
      briefActionsForAttentionType("IDLE_QUOTATION").map((a) => a.label)
    ).toEqual(["Follow up"]);
  });
});
