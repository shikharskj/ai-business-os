"use client";

import { useActionState } from "react";

import {
  updateAutonomyPolicyAction,
  type ActionState,
} from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TenantAutonomyPolicy } from "@/modules/tenant/domain/autonomy-policy";

const initialState: ActionState = {};

function FieldError({
  name,
  fieldErrors,
}: {
  name: string;
  fieldErrors?: Record<string, string>;
}) {
  const message = fieldErrors?.[name];
  if (!message) {
    return null;
  }

  return (
    <p className="text-base text-destructive" role="alert">
      {message}
    </p>
  );
}

export function AutonomyPolicyForm({
  policy,
}: {
  policy: TenantAutonomyPolicy;
}) {
  const [state, formAction, isPending] = useActionState(
    updateAutonomyPolicyAction,
    initialState
  );
  const reminderEnabled = policy.allowedActionClasses.includes(
    "payment_reminder"
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Auto (policy)
      </p>

      <label className="flex items-start gap-3">
        <input
          id="enablePaymentReminderL4"
          name="enablePaymentReminderL4"
          type="checkbox"
          value="on"
          defaultChecked={reminderEnabled}
          className="mt-1 size-5 shrink-0 rounded border border-input accent-primary"
        />
        <span className="flex flex-col gap-1">
          <span className="text-base font-medium">
            Automatically send low-risk payment reminders
          </span>
          <span className="text-base text-muted-foreground">
            When enabled, reminders at or under the amount below may send without
            confirmation (L4). Larger reminders still need Confirm. Invoice
            posting cannot run automatically.
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <label htmlFor="paymentReminderAmountThreshold" className="text-base font-medium">
          Maximum outstanding for automatic reminders (₹)
        </label>
        <Input
          id="paymentReminderAmountThreshold"
          name="paymentReminderAmountThreshold"
          inputMode="decimal"
          defaultValue={policy.amountThresholds.payment_reminder ?? ""}
          placeholder="25000.00"
        />
        <FieldError
          name="paymentReminderAmountThreshold"
          fieldErrors={state.fieldErrors}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="paymentReminderRequireConfirmationAbove"
          className="text-base font-medium"
        >
          Always confirm above (₹, optional)
        </label>
        <Input
          id="paymentReminderRequireConfirmationAbove"
          name="paymentReminderRequireConfirmationAbove"
          inputMode="decimal"
          defaultValue={policy.requireConfirmationAbove.payment_reminder ?? ""}
          placeholder="Same as maximum"
        />
        <p className="text-base text-muted-foreground">
          Leave blank to use the maximum above. Amounts over this still require
          Confirm even if they are under the automatic ceiling.
        </p>
        <FieldError
          name="paymentReminderRequireConfirmationAbove"
          fieldErrors={state.fieldErrors}
        />
      </div>

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save autonomy policy"}
      </Button>
    </form>
  );
}
