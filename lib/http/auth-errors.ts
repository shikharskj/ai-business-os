import "server-only";

import { NextResponse } from "next/server";

import { AuthenticationError } from "@/lib/auth/errors";
import { AuthorizationError } from "@/lib/security/authorize";
import {
  BusinessSettingsForbiddenError,
  TenantAccessDeniedError,
  TenantMembershipUnavailableError,
  TenantRequiredError,
} from "@/modules/tenant/domain/errors";

/**
 * Map auth/tenant errors to HTTP responses for API routes.
 * Contract for audit Wave 1 Auth + all API handlers.
 */
export function authzErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof TenantRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof TenantAccessDeniedError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof TenantMembershipUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof BusinessSettingsForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}

export function isAuthzError(error: unknown): boolean {
  return authzErrorResponse(error) !== null;
}
