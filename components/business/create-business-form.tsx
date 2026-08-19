"use client";

import { useActionState } from "react";

import {
  createBusinessAction,
  type ActionState,
} from "@/app/app/actions";
import { CreateBusinessSuccess } from "@/components/business/activate-organization";
import { Button } from "@/components/ui/button";
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

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating business…" : "Create business"}
      </Button>
    </form>
  );
}
