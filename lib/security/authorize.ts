import "server-only";

import { requireCurrentTenant } from "@/lib/tenant/current-tenant";
import type { TenantContext } from "@/modules/tenant/domain/types";
import { type Permission, roleHasPermission } from "@/lib/security/permissions";

export class AuthorizationError extends Error {
  public readonly permission: Permission;

  constructor(permission: Permission) {
    super(`Forbidden: missing permission "${permission}"`);
    this.name = "AuthorizationError";
    this.permission = permission;
  }
}

export async function authorize(
  permission: Permission
): Promise<TenantContext> {
  const tenant = await requireCurrentTenant();

  if (!roleHasPermission(tenant.membership.role, permission)) {
    throw new AuthorizationError(permission);
  }

  return tenant;
}

export function authorizeSync(
  tenant: TenantContext,
  permission: Permission
): void {
  if (!roleHasPermission(tenant.membership.role, permission)) {
    throw new AuthorizationError(permission);
  }
}
