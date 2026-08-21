import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import { BUSINESS_STATE_SCHEMA_VERSION } from "@/modules/business-state/domain/types";
import { createPrismaBusinessStateProjectionRepository } from "@/modules/business-state/infrastructure/prisma-projection-repository";
import { money } from "@/modules/shared-kernel/money";

describe("Prisma BusinessState commitSnapshots", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const projections = createPrismaBusinessStateProjectionRepository(prisma);

  let tenantId = "";
  let userId = "";

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk_bs_proj_test_${crypto.randomUUID()}` },
    });
    userId = user.id;
    const business = await prisma.business.create({
      data: {
        clerkOrganizationId: `org_bs_proj_test_${crypto.randomUUID()}`,
        name: "BusinessState Projection Test",
        type: "PROPRIETORSHIP",
        ownerUserId: user.id,
        addressLine1: "1 Test Street",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        phone: "9999999999",
        email: "bs-proj-test@example.com",
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

  it("does not abort the transaction when a family insert is skipped as not-newer", async () => {
    const computedAt = new Date("2026-08-21T12:00:00.000Z");

    await projections.commitSnapshots({
      tenantId,
      schemaVersion: BUSINESS_STATE_SCHEMA_VERSION,
      receivablesRisk: {
        tenantId,
        openInvoiceCount: 2,
        overdueInvoiceCount: 1,
        totalOutstanding: money(200_00n),
        overdueOutstanding: money(100_00n),
        currency: "INR",
        computedAt,
      },
    });

    const second = await projections.commitSnapshots({
      tenantId,
      schemaVersion: BUSINESS_STATE_SCHEMA_VERSION,
      receivablesRisk: {
        tenantId,
        openInvoiceCount: 9,
        overdueInvoiceCount: 9,
        totalOutstanding: money(999_00n),
        overdueOutstanding: money(999_00n),
        currency: "INR",
        computedAt,
      },
      inventoryRisk: {
        tenantId,
        lowStockCount: 3,
        thresholdMajor: "5.0000",
        computedAt,
      },
    });

    expect(second.appliedFamilies).toBe(1);

    const receivables = await projections.getReceivablesRisk(tenantId);
    const inventory = await projections.getInventoryRisk(tenantId);
    const meta = await projections.getMeta(tenantId);

    expect(receivables?.openInvoiceCount).toBe(2);
    expect(receivables?.computedAt).toEqual(computedAt);
    expect(inventory?.lowStockCount).toBe(3);
    expect(meta?.schemaVersion).toBe(BUSINESS_STATE_SCHEMA_VERSION);
  });
});
