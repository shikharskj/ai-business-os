export class TenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantError";
  }
}

export class TenantRequiredError extends TenantError {
  constructor() {
    super("An active business membership is required");
    this.name = "TenantRequiredError";
  }
}

export class TenantAccessDeniedError extends TenantError {
  constructor() {
    super("You do not have access to this business");
    this.name = "TenantAccessDeniedError";
  }
}

export class TenantMembershipUnavailableError extends TenantError {
  constructor() {
    super("Membership state is unavailable");
    this.name = "TenantMembershipUnavailableError";
  }
}

export class BusinessSettingsForbiddenError extends TenantError {
  constructor() {
    super("Only business owners and admins can manage settings");
    this.name = "BusinessSettingsForbiddenError";
  }
}
