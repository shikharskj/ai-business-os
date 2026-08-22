"use client";

import { useActionState } from "react";

import {
  updateBusinessProfileAction,
  type ActionState,
} from "@/app/app/actions";
import { BusinessProfileFields } from "@/components/business/business-profile-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionFeedback } from "@/lib/feedback/use-action-feedback";
import type { BusinessProfile } from "@/modules/tenant/domain/types";

const initialState: ActionState = {};

export function EditBusinessProfileForm({
  business,
  readOnly = false,
}: {
  business: BusinessProfile;
  readOnly?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateBusinessProfileAction,
    initialState
  );
  useActionFeedback(state, { errorTitle: "Could not save profile" });

  if (readOnly) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-base text-muted-foreground">
          Contact an admin to change business settings.
        </p>
        <BusinessProfileFields defaultValues={business} readOnly />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <BusinessProfileFields
        defaultValues={business}
        fieldErrors={state.fieldErrors}
      />

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pending={isPending} pendingLabel="Saving">Save changes</SubmitButton>

    </form>
  );
}
