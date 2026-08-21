import type { Permission } from "@/lib/security/permissions";

export class AiToolError extends Error {
  /** Stable machine code used in audit metadata and tool-result messages. */
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AiToolError";
    this.code = code;
  }
}

export class AiToolNotFoundError extends AiToolError {
  constructor(toolName: string) {
    super("TOOL_NOT_FOUND", `No AI tool named "${toolName}" is registered.`);
    this.name = "AiToolNotFoundError";
  }
}

export class AiToolInputError extends AiToolError {
  constructor(message: string) {
    super("TOOL_INPUT_INVALID", message);
    this.name = "AiToolInputError";
  }
}

/**
 * The model tried to supply security context (tenant, user, role, permission).
 * Trusted context comes from the server only (invariant 10).
 */
export class AiToolIdentityOverrideError extends AiToolError {
  constructor(field: string) {
    super(
      "TOOL_IDENTITY_OVERRIDE",
      `AI tool input may not contain "${field}". Identity and tenant context come from the authenticated server context.`
    );
    this.name = "AiToolIdentityOverrideError";
  }
}

export class AiToolAuthorizationError extends AiToolError {
  public readonly permission: Permission;

  constructor(permission: Permission) {
    super(
      "TOOL_FORBIDDEN",
      `Forbidden: this AI tool requires permission "${permission}".`
    );
    this.name = "AiToolAuthorizationError";
    this.permission = permission;
  }
}

export class AiToolResourceNotFoundError extends AiToolError {
  constructor(resource: string) {
    super(
      "TOOL_RESOURCE_NOT_FOUND",
      `${resource} was not found in this business.`
    );
    this.name = "AiToolResourceNotFoundError";
  }
}

/** Tool produced a result that does not satisfy its declared output schema. */
export class AiToolOutputError extends AiToolError {
  constructor(toolName: string) {
    super(
      "TOOL_OUTPUT_INVALID",
      `AI tool "${toolName}" produced a result that failed output validation.`
    );
    this.name = "AiToolOutputError";
  }
}
