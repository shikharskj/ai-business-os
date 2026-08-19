import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import {
  createMemoryOutboxRepository,
  createPrismaOutboxRepository,
} from "@/modules/shared-kernel/outbox";

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

  it("rejects unsupported payload values", async () => {
    const repo = createMemoryOutboxRepository();
    await expect(
      repo.persist({
        tenantId: "t1",
        eventType: "SalesInvoiceCreated",
        aggregateType: "SalesInvoice",
        aggregateId: "inv-1",
        payload: { total: undefined as unknown as number },
      })
    ).rejects.toThrow("unsupported JSON");
  });
});

describe("OutboxRepository (prisma transaction)", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  let tenantId = "";
  let userId = "";

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk_outbox_test_${crypto.randomUUID()}` },
    });
    userId = user.id;
    const business = await prisma.business.create({
      data: {
        clerkOrganizationId: `org_outbox_test_${crypto.randomUUID()}`,
        name: "Outbox Test Business",
        type: "PROPRIETORSHIP",
        ownerUserId: user.id,
        addressLine1: "1 Test Street",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        phone: "9999999999",
        email: "outbox-test@example.com",
        gstRegistrationStatus: "NOT_REGISTERED",
        financialYearStartMonth: 4,
      },
    });
    tenantId = business.id;
  });

  afterAll(async () => {
    if (tenantId) {
      await prisma.business.delete({ where: { id: tenantId } });
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("rolls back the domain write and outbox event together", async () => {
    const marker = crypto.randomUUID();

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.auditRecord.create({
          data: {
            tenantId,
            actorUserId: userId,
            action: "dummy",
            resource: "Test",
            resourceId: marker,
            metadata: {},
          },
        });
        await createPrismaOutboxRepository(tx).persist({
          tenantId,
          eventType: "SalesInvoiceCreated",
          aggregateType: "SalesInvoice",
          aggregateId: marker,
          payload: { marker },
        });
        throw new Error("intentional rollback");
      })
    ).rejects.toThrow("intentional rollback");

    expect(await prisma.auditRecord.count({ where: { resourceId: marker } })).toBe(
      0
    );
    expect(
      await prisma.outboxEvent.count({ where: { aggregateId: marker } })
    ).toBe(0);
  });
});
