"use client";

import { useActionState, useState } from "react";

import {
  applyCustomerAdvanceAction,
  applyCustomerCreditAction,
  type PaymentActionState,
} from "@/app/app/(workspace)/sales/payments/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { MoneyDisplay } from "@/components/business/money-display";
import { formatINR } from "@/modules/shared-kernel/format-money";
import { money, moneyFromMajor, toMajorString } from "@/modules/shared-kernel/money";
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import type { InvoiceOutstanding } from "@/modules/payments/domain/types";

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

function parseAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === ".") {
    return 0n;
  }
  try {
    return moneyFromMajor(trimmed).amountMinor;
  } catch {
    return 0n;
  }
}

type ApplyAdvanceFormProps = {
  invoices: InvoiceOutstanding[];
  available: ReturnType<typeof money>;
  paymentId?: string;
  customerId?: string;
};

export function ApplyAdvanceForm({
  invoices,
  available,
  paymentId,
  customerId,
}: ApplyAdvanceFormProps) {
  const action = paymentId ? applyCustomerAdvanceAction : applyCustomerCreditAction;
  const [state, formAction, isPending] = useActionState(
    action,
    {} as PaymentActionState
  );
  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    if (invoices.length === 1) {
      const invoice = invoices[0]!;
      const fill =
        invoice.outstanding.amountMinor < available.amountMinor
          ? invoice.outstanding
          : available;
      return { [invoice.invoiceId]: toMajorString(fill) };
    }
    return {};
  });

  const allocatedMinor = invoices.reduce(
    (sum, invoice) => sum + parseAmount(allocations[invoice.invoiceId] ?? ""),
    0n
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {paymentId ? <input type="hidden" name="paymentId" value={paymentId} /> : null}
      {customerId ? <input type="hidden" name="customerId" value={customerId} /> : null}
      <input type="hidden" name="allocationCount" value={String(invoices.length)} />

      <p className="text-base text-muted-foreground">
        {formatINR(available)} is held as customer credit. Applying it reduces invoice
        outstanding and does not move cash again.
      </p>
      <FieldError name="allocations" fieldErrors={state.fieldErrors} />

      {invoices.length === 0 ? (
        <p className="text-base text-muted-foreground">
          This customer has no unpaid invoices to apply credit to.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-sm font-medium md:grid">
            <span>Invoice</span>
            <span className="text-right">Outstanding</span>
            <span className="text-right">Apply</span>
          </div>
          {invoices.map((invoice, index) => (
            <div
              key={invoice.invoiceId}
              className="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-b-0 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-3"
            >
              <input
                type="hidden"
                name={`allocation-${index}-invoiceId`}
                value={invoice.invoiceId}
              />
              <div>
                <p className="font-mono text-sm font-medium">{invoice.invoiceNumber}</p>
              </div>
              <div className="flex items-center justify-between gap-2 md:block md:text-right">
                <span className="text-sm text-muted-foreground md:hidden">
                  Outstanding
                </span>
                <MoneyDisplay value={invoice.outstanding} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`allocation-${index}-amount`}
                  className="text-sm font-medium md:hidden"
                >
                  Apply
                </label>
                <Input
                  id={`allocation-${index}-amount`}
                  name={`allocation-${index}-amount`}
                  inputMode="decimal"
                  className="w-full text-right"
                  placeholder={FORM_PLACEHOLDERS.price}
                  value={allocations[invoice.invoiceId] ?? ""}
                  onChange={(event) =>
                    setAllocations((current) => ({
                      ...current,
                      [invoice.invoiceId]: event.target.value,
                    }))
                  }
                  aria-label={`Apply to ${invoice.invoiceNumber}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <SubmitButton
          pending={isPending}
          pendingLabel="Applying credit"
          disabled={invoices.length === 0 || allocatedMinor <= 0n}
        >
          Apply credit
        </SubmitButton>
      </div>
    </form>
  );
}
