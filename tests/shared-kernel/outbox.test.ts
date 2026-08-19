import { describe, expect, it } from "vitest";

import { createMemoryOutboxRepository } from "@/modules/shared-kernel/outbox";

describe("OutboxRepository (memory)", () => {
  it("persists an event", async () => {
    const repo = createMemoryOutboxRepository();
    const result = await repo.persist({
      tenantId: "t1",
      eventType: "SalesInvoiceCreated",
      aggregateType: "SalesInvoice",
      aggregateId: "inv-1",
      payload: { total: 50000 },
    });
    expect(result.id).toBeDefined();
    expect(repo.events).toHaveLength(1);
    expect(repo.events[0]!.eventType).toBe("SalesInvoiceCreated");
  });

  it("persists alongside another write (simulated transaction)", async () => {
    const repo = createMemoryOutboxRepository();
    const domainWrite = Promise.resolve({ id: "inv-2" });
    const [invoice, event] = await Promise.all([
      domainWrite,
      repo.persist({
        tenantId: "t1",
        eventType: "SalesInvoiceCreated",
        aggregateType: "SalesInvoice",
        aggregateId: "inv-2",
        payload: { total: 75000 },
      }),
    ]);
    expect(invoice.id).toBe("inv-2");
    expect(event.id).toBeDefined();
    expect(repo.events).toHaveLength(1);
  });
});
