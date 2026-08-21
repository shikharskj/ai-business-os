import { afterEach, describe, expect, it } from "vitest";

import {
  clearOutboxConsumers,
  createMemoryOutboxDispatchRepository,
  createNotificationsOutboxConsumer,
  createProjectionStubConsumer,
  DOMAIN_EVENT_TYPES,
  isDomainEventType,
  parseDomainEventPayload,
  persistDomainEvent,
  processOutboxConsumers,
  registerDefaultOutboxConsumers,
  registerOutboxConsumer,
  type OutboxEventRecord,
} from "@/modules/events";
import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";
import {
  createInAppChannel,
  createMemoryNotificationContextRepository,
  createMemoryNotificationRepository,
} from "@/modules/notifications";
import { createMemoryBusinessStateProjectionRepository } from "@/modules/business-state";
import type { BusinessStateConsumerDeps } from "@/modules/business-state";
import { createMemoryCatalogRepository } from "@/modules/catalog";
import { createMemoryInventoryRepository } from "@/modules/inventory";
import { createMemoryPaymentRepository } from "@/modules/payments";
import { createMemorySalesRepository } from "@/modules/sales";

function stubBusinessStateDeps(): BusinessStateConsumerDeps {
  return {
    sales: createMemorySalesRepository(),
    payments: createMemoryPaymentRepository(),
    catalog: createMemoryCatalogRepository(),
    inventory: createMemoryInventoryRepository(),
    projections: createMemoryBusinessStateProjectionRepository(),
    async resolveTenantContext() {
      return {
        timezone: "Asia/Kolkata",
        currency: "INR",
        lowStockThresholdMajor: "5.0000",
      };
    },
  };
}

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
    processedAt: partial.processedAt ?? null,
  };
}

describe("typed domain events (post-mvp 01)", () => {
  afterEach(() => {
    clearOutboxConsumers();
  });

  it("catalog includes core and stub event types", () => {
    expect(isDomainEventType("SalesInvoicePosted")).toBe(true);
    expect(isDomainEventType("AttentionDismissed")).toBe(true);
    expect(isDomainEventType("AutomationOutcomeRecorded")).toBe(true);
    expect(isDomainEventType("NotARealEvent")).toBe(false);
    expect(DOMAIN_EVENT_TYPES.length).toBeGreaterThan(20);
  });

  it("parses known payloads via zod schemas", () => {
    const payload = parseDomainEventPayload("PaymentReceived", {
      number: "RCPT/1",
      amount: { amount: "10.00", currency: "INR" },
    });
    expect(payload.number).toBe("RCPT/1");
  });

  it("rejects null, array, and primitive event payloads", () => {
    expect(() => parseDomainEventPayload("SalesInvoicePosted", null)).toThrow(
      /plain object/
    );
    expect(() => parseDomainEventPayload("SalesInvoicePosted", [])).toThrow(
      /plain object/
    );
    expect(() => parseDomainEventPayload("SalesInvoicePosted", "x")).toThrow(
      /plain object/
    );
  });

  it("persistDomainEvent writes through outbox with validated payload", async () => {
    const outbox = createMemoryOutboxRepository();
    await persistDomainEvent(outbox, {
      tenantId: "t1",
      eventType: "SalesInvoicePosted",
      aggregateType: "SalesInvoice",
      aggregateId: "inv-1",
      payload: { number: "INV/1", status: "POSTED", journalId: "j1" },
    });
    expect(outbox.events).toHaveLength(1);
    expect(outbox.events[0]?.eventType).toBe("SalesInvoicePosted");
  });

  it("runs notifications and projection-stub consumers independently", async () => {
    const notifications = createMemoryNotificationRepository();
    const handled = new Set<string>();
    const outbox = createMemoryOutboxDispatchRepository([
      event({
        id: "evt-1",
        tenantId: "tenant-a",
        eventType: "SalesInvoicePosted",
        aggregateId: "inv-1",
      }),
    ]);

    registerOutboxConsumer(
      createNotificationsOutboxConsumer({
        channel: createInAppChannel(notifications),
        context: createMemoryNotificationContextRepository(),
      })
    );
    registerOutboxConsumer(
      createProjectionStubConsumer({ handledEventIds: handled })
    );

    const result = await processOutboxConsumers({ outbox, limit: 10 });

    expect(notifications.records).toHaveLength(1);
    expect(handled.has("evt-1")).toBe(true);
    expect(result.totalFailed).toBe(0);
    expect(outbox.receipts.get("evt-1")?.has("notifications")).toBe(true);
    expect(outbox.receipts.get("evt-1")?.has("projection-stub")).toBe(true);
  });

  it("does not double-apply projection stub on duplicate delivery", async () => {
    const calls: string[] = [];
    const handled = new Set<string>();
    const outbox = createMemoryOutboxDispatchRepository([
      event({
        id: "evt-dup",
        tenantId: "tenant-a",
        eventType: "ExpenseRecorded",
        aggregateId: "exp-1",
        aggregateType: "Expense",
      }),
    ]);

    registerOutboxConsumer(
      createProjectionStubConsumer({
        handledEventIds: handled,
        onHandle: (id) => calls.push(id),
      })
    );

    await processOutboxConsumers({ outbox });
    // Simulate redelivery before receipt (or receipt cleared)
    outbox.receipts.get("evt-dup")?.delete("projection-stub");
    await processOutboxConsumers({ outbox });

    expect(calls).toEqual(["evt-dup", "evt-dup"]);
    expect(handled.size).toBe(1);
  });

  it("keeps notifications idempotent across consumer redelivery", async () => {
    const notifications = createMemoryNotificationRepository();
    const evt = event({
      id: "evt-pay",
      tenantId: "tenant-a",
      eventType: "PaymentReceived",
      aggregateId: "pay-1",
      aggregateType: "CustomerPayment",
      payload: {
        number: "RCPT/1",
        amount: { amount: "100.00", currency: "INR" },
      },
    });
    const outbox = createMemoryOutboxDispatchRepository([evt]);

    registerDefaultOutboxConsumers({
      channel: createInAppChannel(notifications),
      context: createMemoryNotificationContextRepository(),
      businessState: stubBusinessStateDeps(),
    });

    await processOutboxConsumers({ outbox });
    outbox.receipts.get("evt-pay")?.delete("notifications");
    await processOutboxConsumers({ outbox });

    expect(notifications.records).toHaveLength(1);
  });

  it("does not record a receipt when a consumer throws (allows retry)", async () => {
    const outbox = createMemoryOutboxDispatchRepository([
      event({
        id: "evt-fail",
        tenantId: "tenant-a",
        eventType: "SalesInvoicePosted",
        aggregateId: "inv-x",
      }),
    ]);

    registerOutboxConsumer({
      name: "flaky",
      async handle() {
        throw new Error("boom");
      },
    });

    const result = await processOutboxConsumers({ outbox });
    expect(result.totalFailed).toBe(1);
    expect(outbox.receipts.get("evt-fail")?.has("flaky")).toBeFalsy();

    // Retry succeeds
    clearOutboxConsumers();
    registerOutboxConsumer({
      name: "flaky",
      async handle() {
        return { handled: true };
      },
    });
    const retry = await processOutboxConsumers({ outbox });
    expect(retry.totalSucceeded).toBe(1);
    expect(outbox.receipts.get("evt-fail")?.has("flaky")).toBe(true);
  });

  it("returns tenantIdsTouched from the drained outbox batch", async () => {
    const outbox = createMemoryOutboxDispatchRepository([
      event({
        id: "evt-a",
        tenantId: "tenant-outside-sample",
        eventType: "SalesInvoicePosted",
        aggregateId: "inv-a",
      }),
      event({
        id: "evt-b",
        tenantId: "tenant-b",
        eventType: "PaymentReceived",
        aggregateId: "pay-b",
        aggregateType: "CustomerPayment",
      }),
    ]);

    registerOutboxConsumer(createProjectionStubConsumer());
    const result = await processOutboxConsumers({ outbox });

    expect(result.tenantIdsTouched.sort()).toEqual(
      ["tenant-b", "tenant-outside-sample"].sort()
    );
  });

  it("runOutboxProcessing overdue-scans tenants from the outbox batch, not only the cron sample", async () => {
    const { runOutboxProcessing } = await import(
      "@/modules/events/application/run-outbox-processing"
    );
    const notifications = createMemoryNotificationRepository();
    const outbox = createMemoryOutboxDispatchRepository([
      event({
        id: "evt-outside",
        tenantId: "tenant-outside-sample",
        eventType: "CustomerCreated",
        aggregateId: "cust-1",
        aggregateType: "Customer",
        payload: {},
      }),
    ]);

    const result = await runOutboxProcessing({
      outbox,
      channel: createInAppChannel(notifications),
      context: createMemoryNotificationContextRepository({
        overdue: {
          "tenant-outside-sample": [
            {
              id: "inv-overdue",
              number: "INV/1",
              customerName: "Acme",
              dueOn: "2026-01-01",
            },
          ],
          "tenant-in-sample": [
            {
              id: "inv-sample",
              number: "INV/2",
              customerName: "Beta",
              dueOn: "2026-01-01",
            },
          ],
        },
      }),
      businessState: stubBusinessStateDeps(),
      // Cron first-50 sample does not include the tenant that had events.
      overdueTenantIds: ["tenant-in-sample"],
      includeOverdueCheck: true,
    });

    expect(result.overdueChecked).toBe(2);
    const types = notifications.records.map((row) => row.resourceId).sort();
    expect(types).toEqual(["inv-overdue", "inv-sample"]);
  });
});
