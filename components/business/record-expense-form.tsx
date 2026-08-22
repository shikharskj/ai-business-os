"use client";

import { useActionState, useMemo, useState } from "react";

import {
  recordExpenseAction,
  type ExpenseActionState,
} from "@/app/app/(workspace)/expenses/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/modules/expenses/domain/types";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/modules/payments/domain/types";
import { COMMON_GST_RATE_BPS } from "@/modules/tax/domain/types";

function FieldError({
  name,
  fieldErrors,
}: {
  name: string;
  fieldErrors?: Record<string, string>;
}) {
  const message = fieldErrors?.[name];
  if (!message) {
    return null;
  }
  return (
    <p className="text-base text-destructive" role="alert">
      {message}
    </p>
  );
}

function gstRateLabel(bps: number): string {
  if (bps === 0) {
    return "No GST";
  }
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

export function RecordExpenseForm({ today }: { today: string }) {
  const [state, formAction, isPending] = useActionState(
    recordExpenseAction,
    {} as ExpenseActionState
  );
  const [category, setCategory] = useState<ExpenseCategory>("OFFICE");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [taxRateBps, setTaxRateBps] = useState("0");

  const categoryItems = useMemo(
    () =>
      Object.fromEntries(
        EXPENSE_CATEGORIES.map((value) => [value, EXPENSE_CATEGORY_LABELS[value]])
      ),
    []
  );
  const methodItems = useMemo(
    () =>
      Object.fromEntries(
        PAYMENT_METHODS.map((value) => [value, PAYMENT_METHOD_LABELS[value]])
      ),
    []
  );
  const taxItems = useMemo(
    () =>
      Object.fromEntries(
        COMMON_GST_RATE_BPS.map((bps) => [String(bps), gstRateLabel(bps)])
      ),
    []
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="category" className="text-base font-medium">
            Category
          </label>
          <Select
            value={category}
            onValueChange={(value) => {
              const next = String(value ?? "");
              if (EXPENSE_CATEGORIES.includes(next as ExpenseCategory)) {
                setCategory(next as ExpenseCategory);
              }
            }}
            items={categoryItems}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {EXPENSE_CATEGORY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="category" value={category} />
          <FieldError name="category" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="incurredOn" className="text-base font-medium">
            Date
          </label>
          <Input
            id="incurredOn"
            name="incurredOn"
            type="date"
            required
            defaultValue={today}
          />
          <FieldError name="incurredOn" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="amount" className="text-base font-medium">
            Amount (before GST)
          </label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            required
            placeholder="0.00"
          />
          <FieldError name="amount" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="taxRateBps" className="text-base font-medium">
            GST
          </label>
          <Select
            value={taxRateBps}
            onValueChange={(value) => setTaxRateBps(String(value ?? "0"))}
            items={taxItems}
          >
            <SelectTrigger id="taxRateBps" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_GST_RATE_BPS.map((bps) => (
                <SelectItem key={bps} value={String(bps)}>
                  {gstRateLabel(bps)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="taxRateBps" value={taxRateBps} />
          <p className="text-xs text-muted-foreground">
            GST is calculated only when a vendor GSTIN is provided.
          </p>
          <FieldError name="taxRateBps" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="method" className="text-base font-medium">
            Paid by
          </label>
          <Select
            value={method}
            onValueChange={(value) => {
              const next = String(value ?? "");
              if (PAYMENT_METHODS.includes(next as PaymentMethod)) {
                setMethod(next as PaymentMethod);
              }
            }}
            items={methodItems}
          >
            <SelectTrigger id="method" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((paymentMethod) => (
                <SelectItem key={paymentMethod} value={paymentMethod}>
                  {PAYMENT_METHOD_LABELS[paymentMethod]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="method" value={method} />
          <FieldError name="method" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="vendorGstin" className="text-base font-medium">
            Vendor GSTIN (optional)
          </label>
          <Input
            id="vendorGstin"
            name="vendorGstin"
            placeholder={FORM_PLACEHOLDERS.gstin}
          />
          <FieldError name="vendorGstin" fieldErrors={state.fieldErrors} />
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-base font-medium">
          Notes
        </label>
        <Textarea id="notes" name="notes" rows={3} placeholder={FORM_PLACEHOLDERS.notes} />
        <FieldError name="notes" fieldErrors={state.fieldErrors} />
      </div>

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <SubmitButton pending={isPending} pendingLabel="Recording expense">
          Record expense
        </SubmitButton>
      </div>
    </form>
  );
}
