"use client";

import { useActionState } from "react";

import {
  reverseJournalAction,
  type AccountingActionState,
} from "@/app/app/(workspace)/accounting/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReverseJournalForm({
  journalId,
  today,
}: {
  journalId: string;
  today: string;
}) {
  const [state, formAction, isPending] = useActionState(
    reverseJournalAction,
    {} as AccountingActionState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="journalId" value={journalId} />
      <p className="text-base text-muted-foreground">
        Creates a new compensating journal. Posted lines are never edited.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor="accountingDate" className="text-base font-medium">
          Reversal date
        </label>
        <Input
          id="accountingDate"
          name="accountingDate"
          type="date"
          required
          defaultValue={today}
        />
      </div>
      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Reversing…" : "Post reversal"}
      </Button>
    </form>
  );
}
