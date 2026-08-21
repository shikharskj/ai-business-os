import { AiToolIdentityOverrideError } from "@/modules/ai/domain/errors";

/**
 * Keys the model must never be able to set. Tool input schemas are strict, so
 * these would already be rejected as unknown keys — this check exists to fail
 * with a security-specific error that is auditable and testable.
 */
const FORBIDDEN_INPUT_KEYS = [
  "tenantid",
  "businessid",
  "userid",
  "actoruserid",
  "clerkuserid",
  "clerkorganizationid",
  "orgid",
  "organizationid",
  "role",
  "membershiprole",
  "permission",
  "permissions",
] as const;

export function assertNoIdentityOverride(rawInput: unknown): void {
  if (rawInput === null || typeof rawInput !== "object") {
    return;
  }

  for (const key of Object.keys(rawInput as Record<string, unknown>)) {
    if (
      (FORBIDDEN_INPUT_KEYS as readonly string[]).includes(key.toLowerCase())
    ) {
      throw new AiToolIdentityOverrideError(key);
    }
  }
}
