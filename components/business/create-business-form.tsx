"use client";

import { useActionState } from "react";

import {
  createBusinessAction,
  type ActionState,
} from "@/app/app/actions";
import { CreateBusinessSuccess } from "@/components/business/activate-organization";
import { SubmitButton } from "@/components/ui/submit-button";
import { BusinessProfileFields } from "./business-profile-fields";

const initialState: ActionState = {};

export function CreateBusinessForm() {
  const [state, formAction, isPending] = useActionState(
    createBusinessAction,
    initialState
  );

  if (state.clerkOrganizationId) {
    return <CreateBusinessSuccess state={state} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <BusinessProfileFields fieldErrors={state.fieldErrors} />

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pending={isPending} pendingLabel="Creating business">Create business</SubmitButton>

    </form>
  );
}
