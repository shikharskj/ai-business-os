import { describe, expect, it } from "vitest";

import { authorizeSync } from "@/lib/security/authorize";
import type { TenantContext } from "@/modules/tenant/domain/types";

function makeTenant(
  role: "OWNER" | "ADMIN" | "STAFF" | "ACCOUNTANT"
): TenantContext {
  return {
    tenantId: "tenant_1",
    business: {
      id: "tenant_1",
      clerkOrganizationId: "org_1",
      name: "Test Business",
      type: "PROPRIETORSHIP",
      ownerUserId: "user_1",
      addressLine1: "123 Main St",
      addressLine2: null,
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
      country: "IN",
      phone: "9876543210",
      email: "test@example.com",
      gstRegistrationStatus: "NOT_REGISTERED",
      gstin: null,
      financialYearStartMonth: 4,
      timezone: "Asia/Kolkata",
      currency: "INR",
      defaultGstRateBps: 1800,
      lowStockThreshold: "5",
      closedThroughPeriodKey: null,
    },
    membership: {
      id: "mem_1",
      userId: "user_1",
      tenantId: "tenant_1",
      role,
      status: "ACTIVE",
      clerkOrganizationMembershipId: null,
    },
  };
}

describe("authorizeSync", () => {
  it("OWNER passes all permissions", () => {
    const tenant = makeTenant("OWNER");
    expect(() => authorizeSync(tenant, "settings:role:assign")).not.toThrow();
    expect(() => authorizeSync(tenant, "settings:update")).not.toThrow();
    expect(() => authorizeSync(tenant, "accounting:post")).not.toThrow();
  });

  it("ADMIN passes settings:update but not settings:role:assign", () => {
    const tenant = makeTenant("ADMIN");
    expect(() => authorizeSync(tenant, "settings:update")).not.toThrow();
    expect(() => authorizeSync(tenant, "settings:role:assign")).toThrow(
      /Forbidden.*settings:role:assign/
    );
  });

  it("STAFF cannot update settings", () => {
    const tenant = makeTenant("STAFF");
    expect(() => authorizeSync(tenant, "settings:update")).toThrow(/Forbidden/);
    expect(() => authorizeSync(tenant, "customer:create")).not.toThrow();
  });

  it("ACCOUNTANT can post accounting but not create invoices", () => {
    const tenant = makeTenant("ACCOUNTANT");
    expect(() => authorizeSync(tenant, "accounting:post")).not.toThrow();
    expect(() => authorizeSync(tenant, "invoice:create")).toThrow(/Forbidden/);
  });
});
