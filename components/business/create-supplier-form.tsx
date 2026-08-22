"use client";

import { useActionState } from "react";

import {
  createSupplierAction,
  type SupplierActionState,
} from "@/app/app/(workspace)/purchases/suppliers/actions";
import { CustomerFormFields } from "@/components/business/customer-form-fields";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: SupplierActionState = {};

export function CreateSupplierForm() {
  const [state, formAction, isPending] = useActionState(
    createSupplierAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <CustomerFormFields
        heading="Supplier details"
        defaultValues={state.values}
        fieldErrors={state.fieldErrors}
      />
      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pending={isPending} pendingLabel="Saving">Create supplier</SubmitButton>

    </form>
  );
}
