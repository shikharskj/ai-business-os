import { describe, expect, it } from "vitest";

import {
  roleHasPermission,
  getPermissionsForRole,
  type Permission,
} from "@/lib/security/permissions";

const ALL_PERMISSIONS: Permission[] = [
  "invoice:create",
  "invoice:read",
  "invoice:update",
  "invoice:cancel",
  "quotation:create",
  "quotation:read",
  "quotation:update",
  "quotation:cancel",
  "payment:create",
  "payment:read",
  "expense:create",
  "expense:read",
  "inventory:adjust",
  "report:read",
  "accounting:post",
  "customer:create",
  "customer:read",
  "customer:update",
  "supplier:create",
  "supplier:read",
  "supplier:update",
  "product:create",
  "product:read",
  "product:update",
  "settings:read",
  "settings:update",
  "settings:role:assign",
  "document:upload",
  "document:read",
  "document:delete",
];

describe("roleHasPermission", () => {
  it("OWNER has every permission", () => {
    for (const p of ALL_PERMISSIONS) {
      expect(roleHasPermission("OWNER", p)).toBe(true);
    }
  });

  it("ADMIN has all permissions except settings:role:assign", () => {
    expect(roleHasPermission("ADMIN", "settings:update")).toBe(true);
    expect(roleHasPermission("ADMIN", "invoice:create")).toBe(true);
    expect(roleHasPermission("ADMIN", "settings:role:assign")).toBe(false);
  });

  it("STAFF cannot post accounting, adjust inventory, or change settings", () => {
    expect(roleHasPermission("STAFF", "customer:create")).toBe(true);
    expect(roleHasPermission("STAFF", "quotation:create")).toBe(true);
    expect(roleHasPermission("STAFF", "quotation:cancel")).toBe(false);
    expect(roleHasPermission("STAFF", "customer:read")).toBe(true);
    expect(roleHasPermission("STAFF", "supplier:read")).toBe(true);
    expect(roleHasPermission("STAFF", "product:read")).toBe(true);
    expect(roleHasPermission("STAFF", "document:upload")).toBe(true);
    expect(roleHasPermission("STAFF", "document:read")).toBe(true);
    expect(roleHasPermission("STAFF", "accounting:post")).toBe(false);
    expect(roleHasPermission("STAFF", "inventory:adjust")).toBe(false);
    expect(roleHasPermission("STAFF", "settings:update")).toBe(false);
    expect(roleHasPermission("STAFF", "settings:role:assign")).toBe(false);
    expect(roleHasPermission("STAFF", "report:read")).toBe(false);
  });

  it("ACCOUNTANT can post accounting and read reports but not mutate business data", () => {
    expect(roleHasPermission("ACCOUNTANT", "accounting:post")).toBe(true);
    expect(roleHasPermission("ACCOUNTANT", "report:read")).toBe(true);
    expect(roleHasPermission("ACCOUNTANT", "invoice:read")).toBe(true);
    expect(roleHasPermission("ACCOUNTANT", "document:read")).toBe(true);
    expect(roleHasPermission("ACCOUNTANT", "document:upload")).toBe(false);
    expect(roleHasPermission("ACCOUNTANT", "invoice:create")).toBe(false);
    expect(roleHasPermission("ACCOUNTANT", "customer:create")).toBe(false);
    expect(roleHasPermission("ACCOUNTANT", "settings:update")).toBe(false);
    expect(roleHasPermission("ACCOUNTANT", "settings:role:assign")).toBe(false);
  });
});

describe("getPermissionsForRole", () => {
  it("returns a non-empty set for every role", () => {
    for (const role of ["OWNER", "ADMIN", "STAFF", "ACCOUNTANT"] as const) {
      expect(getPermissionsForRole(role).size).toBeGreaterThan(0);
    }
  });

  it("OWNER set is a superset of every other role", () => {
    const ownerPerms = getPermissionsForRole("OWNER");
    for (const role of ["ADMIN", "STAFF", "ACCOUNTANT"] as const) {
      for (const p of getPermissionsForRole(role)) {
        expect(ownerPerms.has(p)).toBe(true);
      }
    }
  });
});
