import type { MembershipRole } from "@/modules/tenant/domain/types";

export type Permission =
  | "invoice:create"
  | "invoice:read"
  | "invoice:update"
  | "invoice:cancel"
  | "payment:create"
  | "payment:read"
  | "expense:create"
  | "expense:read"
  | "inventory:adjust"
  | "report:read"
  | "accounting:post"
  | "customer:create"
  | "customer:read"
  | "customer:update"
  | "supplier:create"
  | "supplier:read"
  | "supplier:update"
  | "product:create"
  | "product:read"
  | "product:update"
  | "settings:read"
  | "settings:update"
  | "settings:role:assign";

const OWNER_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "invoice:create",
  "invoice:read",
  "invoice:update",
  "invoice:cancel",
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
]);

const ADMIN_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "invoice:create",
  "invoice:read",
  "invoice:update",
  "invoice:cancel",
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
]);

const STAFF_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "invoice:create",
  "invoice:read",
  "invoice:update",
  "payment:create",
  "payment:read",
  "expense:create",
  "expense:read",
  "customer:create",
  "customer:read",
  "customer:update",
  "supplier:read",
  "product:read",
  "settings:read",
]);

const ACCOUNTANT_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "invoice:read",
  "payment:read",
  "expense:read",
  "report:read",
  "accounting:post",
  "customer:read",
  "supplier:read",
  "product:read",
  "settings:read",
]);

const ROLE_PERMISSIONS: Record<MembershipRole, ReadonlySet<Permission>> = {
  OWNER: OWNER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  STAFF: STAFF_PERMISSIONS,
  ACCOUNTANT: ACCOUNTANT_PERMISSIONS,
};

export function roleHasPermission(
  role: MembershipRole,
  permission: Permission
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(permission) : false;
}

export function getPermissionsForRole(
  role: MembershipRole
): ReadonlySet<Permission> {
  return ROLE_PERMISSIONS[role] ?? new Set();
}
