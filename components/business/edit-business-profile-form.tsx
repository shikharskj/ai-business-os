"use client";

import { useActionState } from "react";

import {
  updateBusinessProfileAction,
  type ActionState,
} from "@/app/app/actions";
import { BusinessProfileFields } from "@/components/business/business-profile-fields";
import { Button } from "@/components/ui/button";
import type { BusinessProfile } from "@/modules/tenant/domain/types";

const initialState: ActionState = {};

export function EditBusinessProfileForm({
  business,
}: {
  business: BusinessProfile;
}) {
  const [state, formAction, isPending] = useActionState(
    updateBusinessProfileAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <BusinessProfileFields
        defaultValues={business}
        fieldErrors={state.fieldErrors}
      />

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
