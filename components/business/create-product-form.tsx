"use client";

import { useActionState } from "react";

import {
  createProductAction,
  type ProductActionState,
} from "@/app/app/(workspace)/inventory/products/actions";
import { ProductFormFields } from "@/components/business/product-form-fields";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ProductActionState = {};

export function CreateProductForm() {
  const [state, formAction, isPending] = useActionState(
    createProductAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <ProductFormFields
        defaultValues={state.values}
        fieldErrors={state.fieldErrors}
      />
      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pending={isPending} pendingLabel="Saving">Create product</SubmitButton>

    </form>
  );
}
