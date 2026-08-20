"use client";

import { useActionState, useMemo } from "react";

import {
  recordStockAdjustmentAction,
  type StockActionState,
} from "@/app/app/(workspace)/inventory/stock/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: StockActionState = {};

export function AdjustStockForm({
  productId,
  unitOfMeasurement,
  today,
}: {
  productId: string;
  unitOfMeasurement: string;
  today: string;
}) {
  const [state, formAction, isPending] = useActionState(
    recordStockAdjustmentAction,
    initialState
  );

  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="flex flex-col gap-2">
        <label htmlFor="adjust-direction" className="text-base font-medium">
          Adjustment
        </label>
        <Select
          name="direction"
          defaultValue={state.values?.direction ?? "IN"}
          items={{ IN: "Add stock", OUT: "Remove stock" }}
        >
          <SelectTrigger id="adjust-direction" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IN">Add stock</SelectItem>
            <SelectItem value="OUT">Remove stock</SelectItem>
          </SelectContent>
        </Select>
        {state.fieldErrors?.direction ? (
          <p className="text-base text-destructive" role="alert">
            {state.fieldErrors.direction}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="adjust-quantity" className="text-base font-medium">
          Quantity ({unitOfMeasurement})
        </label>
        <Input
          id="adjust-quantity"
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
        <label htmlFor="adjust-occurredOn" className="text-base font-medium">
          Date
        </label>
        <Input
          id="adjust-occurredOn"
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
        <label htmlFor="adjust-reason" className="text-base font-medium">
          Reason
        </label>
        <Textarea
          id="adjust-reason"
          name="reason"
          required
          defaultValue={state.values?.reason}
          placeholder="Why is this stock being corrected?"
        />
        {state.fieldErrors?.reason ? (
          <p className="text-base text-destructive" role="alert">
            {state.fieldErrors.reason}
          </p>
        ) : null}
      </div>
      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Record adjustment"}
      </Button>
    </form>
  );
}
