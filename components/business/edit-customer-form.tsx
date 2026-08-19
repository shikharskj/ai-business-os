"use client";

import { useActionState } from "react";

import {
  updateCustomerAction,
  type CustomerActionState,
} from "@/app/app/(workspace)/sales/customers/actions";
import { CustomerFormFields } from "@/components/business/customer-form-fields";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/modules/party/domain/types";

const initialState: CustomerActionState = {};

export function EditCustomerForm({ customer }: { customer: Customer }) {
  const [state, formAction, isPending] = useActionState(
    updateCustomerAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="customerId" value={customer.id} />
      <CustomerFormFields
        defaultValues={state.values ?? customer}
        fieldErrors={state.fieldErrors}
      />
      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
