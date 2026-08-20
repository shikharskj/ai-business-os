import { describe, expect, it } from "vitest";

import {
  createInAppChannel,
  createMemoryNotificationContextRepository,
  createMemoryNotificationRepository,
  createMemoryOutboxConsumerRepository,
  draftFromOutboxEvent,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  processOutboxNotifications,
  type OutboxEventRecord,
} from "@/modules/notifications";

function event(
  partial: Partial<OutboxEventRecord> &
    Pick<OutboxEventRecord, "eventType" | "tenantId" | "aggregateId">
): OutboxEventRecord {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tenantId: partial.tenantId,
    eventType: partial.eventType,
    aggregateType: partial.aggregateType ?? "SalesInvoice",
    aggregateId: partial.aggregateId,
    payload: partial.payload ?? { number: "INV/26-27/1" },
    createdAt: partial.createdAt ?? new Date(),
  };
}

describe("notifications (26)", () => {
  it("creates in-app notification from posted invoice outbox event", async () => {
    const notifications = createMemoryNotificationRepository();
    const outbox = createMemoryOutboxConsumerRepository([
      event({
        tenantId: "tenant-a",
        eventType: "SalesInvoicePosted",
        aggregateId: "inv-1",
        payload: { number: "INV/26-27/1" },
      }),
    ]);

    const result = await processOutboxNotifications({
      tenantId: "tenant-a",
      outbox,
      notifications,
      context: createMemoryNotificationContextRepository(),
      channel: createInAppChannel(notifications),
      includeOverdueCheck: false,
    });

    expect(result.processedEvents).toBe(1);
    expect(result.notificationsCreated).toBe(1);
    expect(notifications.records).toHaveLength(1);
    expect(notifications.records[0]?.type).toBe("INVOICE_POSTED");
    expect(notifications.records[0]?.tenantId).toBe("tenant-a");
  });

  it("does not duplicate notifications for the same outbox event", async () => {
    const notifications = createMemoryNotificationRepository();
    const evt = event({
      id: "evt-1",
      tenantId: "tenant-a",
      eventType: "PaymentReceived",
      aggregateId: "pay-1",
      aggregateType: "CustomerPayment",
      payload: {
        number: "RCPT/26-27/1",
        amount: { amount: "1500.00", currency: "INR" },
      },
    });
    const outbox = createMemoryOutboxConsumerRepository([evt]);
    const channel = createInAppChannel(notifications);
    const context = createMemoryNotificationContextRepository();

    await processOutboxNotifications({
      outbox,
      notifications,
      context,
      channel,
      includeOverdueCheck: false,
    });

    // Simulate redelivery before markProcessed (or duplicate create)
    outbox.processedIds.delete("evt-1");
    await processOutboxNotifications({
      outbox,
      notifications,
      context,
      channel,
      includeOverdueCheck: false,
    });

    expect(notifications.records).toHaveLength(1);
    expect(notifications.records[0]?.type).toBe("PAYMENT_RECEIVED");
  });

  it("keeps notifications tenant-scoped", async () => {
    const notifications = createMemoryNotificationRepository();
    const outbox = createMemoryOutboxConsumerRepository([
      event({
        tenantId: "tenant-a",
        eventType: "SalesInvoiceCreated",
        aggregateId: "inv-a",
      }),
      event({
        tenantId: "tenant-b",
        eventType: "SalesInvoiceCreated",
        aggregateId: "inv-b",
      }),
    ]);

    await processOutboxNotifications({
      tenantId: "tenant-a",
      outbox,
      notifications,
      context: createMemoryNotificationContextRepository(),
      channel: createInAppChannel(notifications),
      includeOverdueCheck: false,
    });

    const listed = await listNotifications({
      tenantId: "tenant-a",
      notifications,
    });
    expect(listed.notifications).toHaveLength(1);
    expect(listed.notifications[0]?.href).toContain("inv-a");
    expect(listed.unreadCount).toBe(1);

    const other = await listNotifications({
      tenantId: "tenant-b",
      notifications,
    });
    expect(other.notifications).toHaveLength(0);
  });

  it("emits overdue notifications idempotently", async () => {
    const notifications = createMemoryNotificationRepository();
    const outbox = createMemoryOutboxConsumerRepository([]);
    const context = createMemoryNotificationContextRepository({
      overdue: {
        "tenant-a": [
          {
            id: "inv-overdue",
            number: "INV/26-27/9",
            customerName: "Acme",
            dueOn: "2026-08-01",
          },
        ],
      },
    });

    await processOutboxNotifications({
      tenantId: "tenant-a",
      outbox,
      notifications,
      context,
      channel: createInAppChannel(notifications),
      includeOverdueCheck: true,
    });
    await processOutboxNotifications({
      tenantId: "tenant-a",
      outbox,
      notifications,
      context,
      channel: createInAppChannel(notifications),
      includeOverdueCheck: true,
    });

    expect(notifications.records).toHaveLength(1);
    expect(notifications.records[0]?.type).toBe("INVOICE_OVERDUE");
  });

  it("notifies low stock after inventory movement when below threshold", async () => {
    const notifications = createMemoryNotificationRepository();
    const outbox = createMemoryOutboxConsumerRepository([
      event({
        tenantId: "tenant-a",
        eventType: "InventoryAdjusted",
        aggregateType: "inventory",
        aggregateId: "prod-1",
        payload: { cause: "ADJUSTMENT" },
      }),
    ]);
    const context = createMemoryNotificationContextRepository({
      thresholds: { "tenant-a": "5.0000" },
      products: {
        "tenant-a:prod-1": {
          name: "Basmati Rice",
          sku: "RICE-1",
          quantityMajor: "3.0000",
        },
      },
    });

    await processOutboxNotifications({
      tenantId: "tenant-a",
      outbox,
      notifications,
      context,
      channel: createInAppChannel(notifications),
      includeOverdueCheck: false,
    });

    expect(notifications.records).toHaveLength(1);
    expect(notifications.records[0]?.type).toBe("LOW_STOCK");
  });

  it("skips low stock when quantity is above threshold", async () => {
    const notifications = createMemoryNotificationRepository();
    const outbox = createMemoryOutboxConsumerRepository([
      event({
        tenantId: "tenant-a",
        eventType: "InventoryMoved",
        aggregateType: "inventory",
        aggregateId: "prod-1",
      }),
    ]);
    const context = createMemoryNotificationContextRepository({
      products: {
        "tenant-a:prod-1": {
          name: "Basmati Rice",
          sku: "RICE-1",
          quantityMajor: "20.0000",
        },
      },
    });

    await processOutboxNotifications({
      tenantId: "tenant-a",
      outbox,
      notifications,
      context,
      channel: createInAppChannel(notifications),
      includeOverdueCheck: false,
    });

    expect(notifications.records).toHaveLength(0);
    expect(outbox.processedIds.size).toBe(1);
  });

  it("marks notifications read without leaking across tenants", async () => {
    const notifications = createMemoryNotificationRepository();
    await notifications.createIdempotent({
      tenantId: "tenant-a",
      channel: "IN_APP",
      type: "INVOICE_POSTED",
      title: "Invoice posted",
      body: "Posted",
      idempotencyKey: "a-1",
    });
    const other = await notifications.createIdempotent({
      tenantId: "tenant-b",
      channel: "IN_APP",
      type: "INVOICE_POSTED",
      title: "Invoice posted",
      body: "Posted",
      idempotencyKey: "b-1",
    });

    await markAllNotificationsRead({
      tenantId: "tenant-a",
      notifications,
    });
    const listedA = await listNotifications({
      tenantId: "tenant-a",
      notifications,
    });
    expect(listedA.unreadCount).toBe(0);

    const stillUnread = await markNotificationRead({
      tenantId: "tenant-a",
      notificationId: other.record.id,
      notifications,
    }).catch((error: Error) => error.message);

    expect(stillUnread).toBe("Notification not found.");
    expect(
      (await listNotifications({ tenantId: "tenant-b", notifications }))
        .unreadCount
    ).toBe(1);
  });

  it("maps known domain events and ignores unrelated ones", () => {
    expect(
      draftFromOutboxEvent(
        event({
          tenantId: "t",
          eventType: "SalesInvoiceCreated",
          aggregateId: "1",
        })
      )
    ).toMatchObject({ type: "INVOICE_CREATED" });
    expect(
      draftFromOutboxEvent(
        event({
          tenantId: "t",
          eventType: "CustomerCreated",
          aggregateId: "1",
        })
      )
    ).toBeNull();
  });
});
