"use client";

import { useActionState } from "react";

import {
  createSupplierAction,
  type SupplierActionState,
} from "@/app/app/(workspace)/purchases/suppliers/actions";
import { CustomerFormFields } from "@/components/business/customer-form-fields";
import { Button } from "@/components/ui/button";

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
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Create supplier"}
      </Button>
    </form>
  );
}
