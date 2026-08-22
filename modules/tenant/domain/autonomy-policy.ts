import {
  compareMoney,
  moneyFromMajor,
  toMajorString,
  type Money,
} from "@/modules/shared-kernel/money";

/**
 * Bounded autonomy ladder. L5 unrestricted financial autonomy is forbidden
 * and is not a member of this union.
 */
export const AUTONOMY_LEVELS = ["L0", "L1", "L2", "L3", "L4"] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

/**
 * Action classes that may be enabled for L4 under tenant policy.
 * Invoice, purchase, and expense posting are intentionally absent — they must
 * stay L3 (confirm) or never auto-run. L4 money-post classes stay off.
 */
export const AUTONOMY_ACTION_CLASSES = ["payment_reminder"] as const;
export type AutonomyActionClass = (typeof AUTONOMY_ACTION_CLASSES)[number];

export const AUTONOMY_ACTION_CLASS_SET: ReadonlySet<string> = new Set(
  AUTONOMY_ACTION_CLASSES
);

export function isAutonomyActionClass(
  value: string
): value is AutonomyActionClass {
  return AUTONOMY_ACTION_CLASS_SET.has(value);
}

export type TenantAutonomyPolicy = {
  tenantId: string;
  allowedActionClasses: AutonomyActionClass[];
  /** Inclusive L4 ceiling per class, major units (e.g. "25000.00"). */
  amountThresholds: Partial<Record<AutonomyActionClass, string>>;
  /** Amounts above this still need L3 confirm even if under the L4 ceiling. */
  requireConfirmationAbove: Partial<Record<AutonomyActionClass, string>>;
  /** Named automations that must not auto-run (e.g. `proof.noop`). */
  disabledAutomations: string[];
};

export type AutonomyDenialReason =
  | "class_not_allowed"
  | "automation_disabled"
  | "missing_threshold"
  | "missing_amount"
  | "invalid_amount"
  | "over_threshold"
  | "confirmation_required";

export type AutonomyDecision =
  | { allowed: true; level: "L4" }
  | { allowed: false; reason: AutonomyDenialReason };

export function defaultAutonomyPolicy(tenantId: string): TenantAutonomyPolicy {
  return {
    tenantId,
    allowedActionClasses: [],
    amountThresholds: {},
    requireConfirmationAbove: {},
    disabledAutomations: [],
  };
}

export function normalizeAutonomyAmountMajor(value: string): string {
  return toMajorString(moneyFromMajor(value.trim(), "INR"));
}

function parseAmount(value: string, currency: string): Money | null {
  try {
    const money = moneyFromMajor(value.trim(), currency);
    if (money.amountMinor < 0n) {
      return null;
    }
    return money;
  } catch {
    return null;
  }
}

/**
 * L4 runs only when the tenant explicitly allows the class, the amount is
 * present and at most the configured ceiling, and the action is not disabled.
 * Missing policy rows (empty allow-list) fail closed.
 */
export function evaluateL4Autonomy(input: {
  actionClass: string;
  amountMajor: string | null | undefined;
  policy: TenantAutonomyPolicy;
  automationId?: string;
  currency?: string;
}): AutonomyDecision {
  if (!isAutonomyActionClass(input.actionClass)) {
    return { allowed: false, reason: "class_not_allowed" };
  }

  if (!input.policy.allowedActionClasses.includes(input.actionClass)) {
    return { allowed: false, reason: "class_not_allowed" };
  }

  const disabled = input.policy.disabledAutomations;
  if (
    disabled.includes(input.actionClass) ||
    (input.automationId !== undefined && disabled.includes(input.automationId))
  ) {
    return { allowed: false, reason: "automation_disabled" };
  }

  const thresholdMajor = input.policy.amountThresholds[input.actionClass];
  if (!thresholdMajor) {
    return { allowed: false, reason: "missing_threshold" };
  }

  if (input.amountMajor == null || input.amountMajor.trim() === "") {
    return { allowed: false, reason: "missing_amount" };
  }

  const currency = input.currency ?? "INR";
  const amount = parseAmount(input.amountMajor, currency);
  const threshold = parseAmount(thresholdMajor, currency);
  if (!amount || !threshold) {
    return { allowed: false, reason: "invalid_amount" };
  }

  if (compareMoney(amount, threshold) > 0) {
    return { allowed: false, reason: "over_threshold" };
  }

  const confirmAboveMajor =
    input.policy.requireConfirmationAbove[input.actionClass];
  if (confirmAboveMajor) {
    const confirmAbove = parseAmount(confirmAboveMajor, currency);
    if (!confirmAbove) {
      return { allowed: false, reason: "invalid_amount" };
    }
    if (compareMoney(amount, confirmAbove) > 0) {
      return { allowed: false, reason: "confirmation_required" };
    }
  }

  return { allowed: true, level: "L4" };
}
