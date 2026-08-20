import { describe, expect, it } from "vitest";

import {
  buildPrefixTsQuery,
  createMemorySearchRepository,
  searchBusinessRecords,
} from "@/modules/search";

describe("global search (25)", () => {
  it("builds prefix tsquery tokens", () => {
    expect(buildPrefixTsQuery("Acme Traders")).toBe("acme:* & traders:*");
    expect(buildPrefixTsQuery("INV-1024")).toBe("inv:* & 1024:*");
    expect(buildPrefixTsQuery("   ")).toBeNull();
  });

  it("returns tenant-scoped matches only", async () => {
    const search = createMemorySearchRepository([
      {
        tenantId: "tenant-a",
        entityType: "customer",
        id: "c1",
        title: "Acme Traders",
        subtitle: "27AAAAA0000A1Z5",
        href: "/app/sales/customers/c1",
        status: "ACTIVE",
        amountLabel: null,
        partyName: "Acme Traders",
        businessDate: null,
        searchText: "Acme Traders 27AAAAA0000A1Z5",
      },
      {
        tenantId: "tenant-b",
        entityType: "customer",
        id: "c2",
        title: "Acme Other",
        subtitle: null,
        href: "/app/sales/customers/c2",
        status: "ACTIVE",
        amountLabel: null,
        partyName: "Acme Other",
        businessDate: null,
        searchText: "Acme Other",
      },
      {
        tenantId: "tenant-a",
        entityType: "invoice",
        id: "i1",
        title: "INV-1024",
        subtitle: "Acme Traders",
        href: "/app/sales/invoices/i1",
        status: "UNPAID",
        amountLabel: "₹45000.00",
        partyName: "Acme Traders",
        businessDate: "2026-08-10",
        searchText: "INV-1024 Acme Traders",
      },
    ]);

    const result = await searchBusinessRecords({
      tenantId: "tenant-a",
      role: "OWNER",
      query: "Acme",
      search,
    });

    expect(result.results.map((row) => row.id).sort()).toEqual(["c1", "i1"]);
    expect(result.results.every((row) => row.href.startsWith("/app/"))).toBe(
      true
    );
  });

  it("filters by entity type when requested", async () => {
    const search = createMemorySearchRepository([
      {
        tenantId: "tenant-a",
        entityType: "customer",
        id: "c1",
        title: "Beta Customer",
        subtitle: null,
        href: "/app/sales/customers/c1",
        status: "ACTIVE",
        amountLabel: null,
        partyName: "Beta Customer",
        businessDate: null,
        searchText: "Beta Customer",
      },
      {
        tenantId: "tenant-a",
        entityType: "expense",
        id: "e1",
        title: "EXP-Beta",
        subtitle: "OFFICE",
        href: "/app/expenses/e1",
        status: "OFFICE",
        amountLabel: "₹100.00",
        partyName: null,
        businessDate: "2026-08-01",
        searchText: "EXP-Beta OFFICE",
      },
    ]);

    const customersOnly = await searchBusinessRecords({
      tenantId: "tenant-a",
      role: "OWNER",
      query: "Beta",
      type: "customer",
      search,
    });
    expect(customersOnly.results).toHaveLength(1);
    expect(customersOnly.results[0]?.entityType).toBe("customer");
  });

  it("returns empty results for no match", async () => {
    const search = createMemorySearchRepository([
      {
        tenantId: "tenant-a",
        entityType: "product",
        id: "p1",
        title: "Widget",
        subtitle: "W-1",
        href: "/app/inventory/products/p1",
        status: "PRODUCT",
        amountLabel: null,
        partyName: null,
        businessDate: null,
        searchText: "Widget W-1",
      },
    ]);

    const result = await searchBusinessRecords({
      tenantId: "tenant-a",
      role: "OWNER",
      query: "nonexistent",
      search,
    });
    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
  });
});
