import {
  ClosedPeriodError,
  AccountingError,
} from "@/modules/accounting/domain/errors";
import {
  periodKeyFromDate,
} from "@/modules/accounting/domain/period";
import type { BusinessDate } from "@/modules/shared-kernel/dates";

const PERIOD_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isPeriodKey(value: string): boolean {
  return PERIOD_KEY_PATTERN.test(value);
}

export function assertPeriodKey(periodKey: string): void {
  if (!isPeriodKey(periodKey)) {
    throw new AccountingError(`Invalid accounting period ${periodKey}.`);
  }
}

/** True when periodKey is on or before the closed-through boundary. */
export function isPeriodClosed(
  periodKey: string,
  closedThroughPeriodKey: string | null
): boolean {
  assertPeriodKey(periodKey);
  if (!closedThroughPeriodKey) {
    return false;
  }
  assertPeriodKey(closedThroughPeriodKey);
  return periodKey <= closedThroughPeriodKey;
}

export function currentPeriodKey(today: BusinessDate): string {
  return periodKeyFromDate(today);
}

/**
 * Close a period through `periodKey` (inclusive). Rejects closing a future
 * period beyond the current calendar month, or re-closing an already-closed period.
 */
export function assertCanClosePeriod(input: {
  periodKey: string;
  closedThroughPeriodKey: string | null;
  currentPeriodKey: string;
}): void {
  assertPeriodKey(input.periodKey);
  assertPeriodKey(input.currentPeriodKey);
  if (input.closedThroughPeriodKey) {
    assertPeriodKey(input.closedThroughPeriodKey);
  }

  if (input.periodKey > input.currentPeriodKey) {
    throw new AccountingError(
      `Cannot close future period ${input.periodKey}. Current period is ${input.currentPeriodKey}.`
    );
  }

  if (
    input.closedThroughPeriodKey &&
    input.periodKey <= input.closedThroughPeriodKey
  ) {
    throw new ClosedPeriodError(input.periodKey);
  }
}
