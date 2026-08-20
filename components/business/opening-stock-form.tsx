"use client";

import { useActionState } from "react";

import {
  recordOpeningStockAction,
  type StockActionState,
} from "@/app/app/(workspace)/inventory/stock/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialState: StockActionState = {};

export function OpeningStockForm({
  productId,
  unitOfMeasurement,
  today,
}: {
  productId: string;
  unitOfMeasurement: string;
  today: string;
}) {
  const [state, formAction, isPending] = useActionState(
    recordOpeningStockAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={productId} />
      <div className="flex flex-col gap-2">
        <label htmlFor="opening-quantity" className="text-base font-medium">
          Opening quantity ({unitOfMeasurement})
        </label>
        <Input
          id="opening-quantity"
          name="quantity"
          inputMode="decimal"
          required
          defaultValue={state.values?.quantity}
          placeholder="0"
        />
        {state.fieldErrors?.quantity ? (
          <p className="text-base text-destructive" role="alert">
            {state.fieldErrors.quantity}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="opening-occurredOn" className="text-base font-medium">
          Date
        </label>
        <Input
          id="opening-occurredOn"
          name="occurredOn"
          type="date"
          required
          defaultValue={state.values?.occurredOn ?? today}
        />
        {state.fieldErrors?.occurredOn ? (
          <p className="text-base text-destructive" role="alert">
            {state.fieldErrors.occurredOn}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="opening-reason" className="text-base font-medium">
          Notes
        </label>
        <Textarea
          id="opening-reason"
          name="reason"
          defaultValue={state.values?.reason}
          placeholder="Optional note for this opening quantity"
        />
      </div>
      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Record opening stock"}
      </Button>
    </form>
  );
}
