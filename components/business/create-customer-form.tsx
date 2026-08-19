"use client";

import { useActionState } from "react";

import {
  createCustomerAction,
  type CustomerActionState,
} from "@/app/app/(workspace)/sales/customers/actions";
import { CustomerFormFields } from "@/components/business/customer-form-fields";
import { Button } from "@/components/ui/button";

const initialState: CustomerActionState = {};

export function CreateCustomerForm() {
  const [state, formAction, isPending] = useActionState(
    createCustomerAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <CustomerFormFields
        defaultValues={state.values}
        fieldErrors={state.fieldErrors}
      />
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Create customer"}
      </Button>
    </form>
  );
}
