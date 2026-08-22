import { describe, expect, it } from "vitest";

import {
  createMemoryAttentionQueueRepository,
  proposeBriefPaymentReminder,
} from "@/modules/business-state";
import { AttentionItemNotFoundError } from "@/modules/business-state/domain/errors";
import type { AttentionItem } from "@/modules/business-state/domain/types";
import { verifyAiActionToken } from "@/modules/ai/domain/action-token";
import { money } from "@/modules/shared-kernel/money";

const SECRET = "test-brief-propose-secret";

function overdueItem(
  overrides: Partial<AttentionItem> = {}
): AttentionItem {
  const now = new Date("2026-08-22T04:00:00.000Z");
  return {
    id: "att-overdue",
    tenantId: "tenant-a",
    naturalKey: "overdue:inv-1",
    type: "OVERDUE_RECEIVABLE",
    severity: 90,
    status: "OPEN",
    title: "Overdue",
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

describe("proposeBriefPaymentReminder", () => {
  it("signs a send_payment_reminders pending action for overdue rows", async () => {
    const attention = createMemoryAttentionQueueRepository();
    attention.items.push(overdueItem());

    const pending = await proposeBriefPaymentReminder({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      attentionItemId: "att-overdue",
      secret: SECRET,
      attention,
      now: Date.parse("2026-08-22T04:00:00.000Z"),
    });

    expect(pending.toolName).toBe("send_payment_reminders");
    expect(JSON.parse(pending.argumentsJson)).toEqual({
      invoiceIds: ["inv-1"],
    });
    expect(pending.title).toContain("payment reminder");

    const payload = verifyAiActionToken({
      secret: SECRET,
      token: pending.token,
      now: Date.parse("2026-08-22T04:00:00.000Z"),
    });
    expect(payload?.tenantId).toBe("tenant-a");
    expect(payload?.actorUserId).toBe("user-1");
    expect(payload?.toolName).toBe("send_payment_reminders");
  });

  it("rejects non-overdue and missing items", async () => {
    const attention = createMemoryAttentionQueueRepository();
    attention.items.push(
      overdueItem({
        id: "att-stock",
        type: "LOW_STOCK",
        naturalKey: "low-stock:p1",
        resourceType: "Product",
        resourceId: "prod-1",
        amount: null,
        currency: null,
        factId: null,
      })
    );

    await expect(
      proposeBriefPaymentReminder({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        attentionItemId: "att-stock",
        secret: SECRET,
        attention,
      })
    ).rejects.toBeInstanceOf(AttentionItemNotFoundError);

    await expect(
      proposeBriefPaymentReminder({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        attentionItemId: "missing",
        secret: SECRET,
        attention,
      })
    ).rejects.toBeInstanceOf(AttentionItemNotFoundError);
  });

  it("rejects cross-tenant attention ids", async () => {
    const attention = createMemoryAttentionQueueRepository();
    attention.items.push(overdueItem({ tenantId: "tenant-b" }));

    await expect(
      proposeBriefPaymentReminder({
        tenantId: "tenant-a",
        actorUserId: "user-1",
        attentionItemId: "att-overdue",
        secret: SECRET,
        attention,
      })
    ).rejects.toBeInstanceOf(AttentionItemNotFoundError);
  });
});
