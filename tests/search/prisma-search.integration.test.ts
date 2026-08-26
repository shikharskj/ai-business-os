import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  createPrismaSearchRepository,
  searchBusinessRecords,
} from "@/modules/search";

describe("prisma search FTS smoke", () => {
  let tenantId = "";
  let userId = "";
  let partyId = "";

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: `clerk_search_fts_${crypto.randomUUID()}` },
    });
    userId = user.id;

    const business = await prisma.business.create({
      data: {
        clerkOrganizationId: `org_search_fts_${crypto.randomUUID()}`,
        name: "Search FTS Smoke Business",
        type: "PROPRIETORSHIP",
        ownerUserId: user.id,
        addressLine1: "1 Test Street",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        phone: "9999999999",
        email: "search-fts@example.com",
        gstRegistrationStatus: "NOT_REGISTERED",
        financialYearStartMonth: 4,
      },
    });
    tenantId = business.id;

    const party = await prisma.party.create({
      data: {
        tenantId,
        kind: "CUSTOMER",
        name: "Zephyr Traders Smoke",
        status: "ACTIVE",
        phone: "9888877777",
        email: "zephyr@example.com",
      },
    });
    partyId = party.id;
  });

  afterAll(async () => {
    if (partyId) {
      try {
        await prisma.party.delete({ where: { id: partyId } });
      } catch (error) {
        console.warn("Failed to delete party:", error);
      }
    }
    if (tenantId) {
      try {
        await prisma.business.delete({ where: { id: tenantId } });
      } catch (error) {
        console.warn("Failed to delete business:", error);
      }
    }
    if (userId) {
      try {
        await prisma.user.delete({ where: { id: userId } });
      } catch (error) {
        console.warn("Failed to delete user:", error);
      }
    }
  });

  it("finds a customer via Prisma FTS repository", async () => {
    const indexRows = await prisma.$queryRawUnsafe<
      Array<{ indexname: string }>
    >(
      `SELECT indexname FROM pg_indexes WHERE indexname = 'parties_search_fts_idx'`
    );
    expect(indexRows.length).toBeGreaterThanOrEqual(1);

    const search = createPrismaSearchRepository(prisma);
    const result = await searchBusinessRecords({
      tenantId,
      role: "OWNER",
      query: "Zephyr",
      search,
    });

    expect(result.results.some((row) => row.id === partyId)).toBe(true);
  });
});
