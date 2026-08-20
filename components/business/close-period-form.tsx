"use client";

import { useActionState } from "react";

import {
  closePeriodAction,
  type AccountingActionState,
} from "@/app/app/(workspace)/accounting/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClosePeriodForm({ defaultPeriodKey }: { defaultPeriodKey: string }) {
  const [state, formAction, isPending] = useActionState(
    closePeriodAction,
    {} as AccountingActionState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-base text-muted-foreground">
        Closing a period rejects further posts dated on or before that month. This cannot
        be undone from the MVP UI.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor="periodKey" className="text-base font-medium">
          Close through period
        </label>
        <Input
          id="periodKey"
          name="periodKey"
          required
          defaultValue={defaultPeriodKey}
          placeholder="YYYY-MM"
        />
        {state.fieldErrors?.periodKey ? (
          <p className="text-base text-destructive" role="alert">
            {state.fieldErrors.periodKey}
          </p>
        ) : null}
      </div>
      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Closing…" : "Close period"}
      </Button>
    </form>
  );
}
