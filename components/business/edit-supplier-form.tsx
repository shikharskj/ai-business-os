"use client";

import { useActionState } from "react";

import {
  updateSupplierAction,
  type SupplierActionState,
} from "@/app/app/(workspace)/purchases/suppliers/actions";
import { CustomerFormFields } from "@/components/business/customer-form-fields";
import { Button } from "@/components/ui/button";
import type { Supplier } from "@/modules/party/domain/types";

const initialState: SupplierActionState = {};

export function EditSupplierForm({ supplier }: { supplier: Supplier }) {
  const [state, formAction, isPending] = useActionState(
    updateSupplierAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="supplierId" value={supplier.id} />
      <CustomerFormFields
        heading="Supplier details"
        defaultValues={state.values ?? supplier}
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
