import type { MembershipRole } from "@/modules/tenant/domain/types";

export type Permission =
  | "invoice:create"
  | "invoice:read"
  | "invoice:update"
  | "invoice:cancel"
  | "quotation:create"
  | "quotation:read"
  | "quotation:update"
  | "quotation:cancel"
  | "sales-order:create"
  | "sales-order:read"
  | "sales-order:update"
  | "sales-order:cancel"
  | "credit-note:create"
  | "credit-note:read"
  | "credit-note:update"
  | "credit-note:cancel"
  | "payment:create"
  | "payment:read"
  | "expense:create"
  | "expense:read"
  | "purchase:create"
  | "purchase:read"
  | "purchase:update"
  | "purchase:cancel"
  | "purchase-return:create"
  | "purchase-return:read"
  | "purchase-return:update"
  | "purchase-return:cancel"
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
  | "settings:role:assign"
  | "document:upload"
  | "document:read"
  | "document:delete";

const OWNER_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "invoice:create",
  "invoice:read",
  "invoice:update",
  "invoice:cancel",
  "quotation:create",
  "quotation:read",
  "quotation:update",
  "quotation:cancel",
  "sales-order:create",
  "sales-order:read",
  "sales-order:update",
  "sales-order:cancel",
  "credit-note:create",
  "credit-note:read",
  "credit-note:update",
  "credit-note:cancel",
  "payment:create",
  "payment:read",
  "expense:create",
  "expense:read",
  "purchase:create",
  "purchase:read",
  "purchase:update",
  "purchase:cancel",
  "purchase-return:create",
  "purchase-return:read",
  "purchase-return:update",
  "purchase-return:cancel",
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
]);

const ADMIN_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "invoice:create",
  "invoice:read",
  "invoice:update",
  "invoice:cancel",
  "quotation:create",
  "quotation:read",
  "quotation:update",
  "quotation:cancel",
  "sales-order:create",
  "sales-order:read",
  "sales-order:update",
  "sales-order:cancel",
  "credit-note:create",
  "credit-note:read",
  "credit-note:update",
  "credit-note:cancel",
  "payment:create",
  "payment:read",
  "expense:create",
  "expense:read",
  "purchase:create",
  "purchase:read",
  "purchase:update",
  "purchase:cancel",
  "purchase-return:create",
  "purchase-return:read",
  "purchase-return:update",
  "purchase-return:cancel",
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
  "document:upload",
  "document:read",
  "document:delete",
]);

const STAFF_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "invoice:create",
  "invoice:read",
  "invoice:update",
  "quotation:create",
  "quotation:read",
  "quotation:update",
  "sales-order:create",
  "sales-order:read",
  "sales-order:update",
  "credit-note:create",
  "credit-note:read",
  "credit-note:update",
  "payment:create",
  "payment:read",
  "expense:create",
  "expense:read",
  "purchase:create",
  "purchase:read",
  "purchase:update",
  "purchase-return:create",
  "purchase-return:read",
  "purchase-return:update",
  "customer:create",
  "customer:read",
  "customer:update",
  "supplier:read",
  "product:read",
  "settings:read",
  "document:upload",
  "document:read",
]);

const ACCOUNTANT_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "invoice:read",
  "quotation:read",
  "sales-order:read",
  "credit-note:read",
  "payment:read",
  "expense:read",
  "purchase:read",
  "purchase-return:read",
  "report:read",
  "accounting:post",
  "customer:read",
  "supplier:read",
  "product:read",
  "settings:read",
  "document:read",
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
