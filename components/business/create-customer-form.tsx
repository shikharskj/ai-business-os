"use client";

import { useActionState } from "react";

import {
  createCustomerAction,
  type CustomerActionState,
} from "@/app/app/(workspace)/sales/customers/actions";
import { CustomerFormFields } from "@/components/business/customer-form-fields";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: CustomerActionState = {};

export function CreateCustomerForm({
  returnTo = null,
}: {
  returnTo?: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    createCustomerAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {returnTo ? (
        <input type="hidden" name="returnTo" value={returnTo} />
      ) : null}
      <CustomerFormFields
        defaultValues={state.values}
        fieldErrors={state.fieldErrors}
      />
      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pending={isPending} pendingLabel="Saving">Create customer</SubmitButton>

    </form>
  );
}
