"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  recordCustomerPaymentAction,
  type PaymentActionState,
} from "@/app/app/(workspace)/sales/payments/actions";
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
import { MoneyDisplay } from "@/components/business/money-display";
import { formatINR } from "@/modules/shared-kernel/format-money";
import { money, moneyFromMajor, toMajorString } from "@/modules/shared-kernel/money";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type InvoiceOutstanding,
  type PaymentMethod,
} from "@/modules/payments/domain/types";

export type PaymentCustomerOption = {
  id: string;
  name: string;
};

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

type RecordPaymentFormProps = {
  customers: PaymentCustomerOption[];
  invoices: InvoiceOutstanding[];
  today: string;
  selectedCustomerId: string;
  selectedInvoiceId?: string;
};

export function RecordPaymentForm(props: RecordPaymentFormProps) {
  return (
    <RecordPaymentFormFields
      key={`${props.selectedCustomerId}:${props.selectedInvoiceId ?? ""}`}
      {...props}
    />
  );
}

function RecordPaymentFormFields({
  customers,
  invoices,
  today,
  selectedCustomerId,
  selectedInvoiceId,
}: RecordPaymentFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    recordCustomerPaymentAction,
    {} as PaymentActionState
  );
  const selectedInvoice = invoices.find((row) => row.invoiceId === selectedInvoiceId);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState(() =>
    selectedInvoice ? toMajorString(selectedInvoice.outstanding) : ""
  );
  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    if (!selectedInvoice) {
      return {};
    }
    return { [selectedInvoice.invoiceId]: toMajorString(selectedInvoice.outstanding) };
  });

  const methodItems = useMemo(
    () =>
      Object.fromEntries(
        PAYMENT_METHODS.map((method) => [method, PAYMENT_METHOD_LABELS[method]])
      ),
    []
  );
  const customerItems = useMemo(
    () => Object.fromEntries(customers.map((customer) => [customer.id, customer.name])),
    [customers]
  );

  const allocatedMinor = invoices.reduce((sum, invoice) => {
    return sum + parseAmount(allocations[invoice.invoiceId] ?? "");
  }, 0n);
  const paymentMinor = parseAmount(amount);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="customerId" value={selectedCustomerId} />
      <input type="hidden" name="allocationCount" value={String(invoices.length)} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="customerId" className="text-base font-medium">
            Customer
          </label>
          <Select
            value={selectedCustomerId}
            onValueChange={(value) => {
              const next = String(value ?? "");
              router.push(`/app/sales/payments/new?customerId=${next}`);
            }}
            items={customerItems}
          >
            <SelectTrigger id="customerId" className="w-full">
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError name="customerId" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="receivedOn" className="text-base font-medium">
            Received on
          </label>
          <Input
            id="receivedOn"
            name="receivedOn"
            type="date"
            required
            defaultValue={today}
          />
          <FieldError name="receivedOn" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="method" className="text-base font-medium">
            Method
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
          <label htmlFor="amount" className="text-base font-medium">
            Amount received
          </label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
          <FieldError name="amount" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="reference" className="text-base font-medium">
            Reference
          </label>
          <Input
            id="reference"
            name="reference"
            placeholder="UPI ref, cheque no., or transfer note"
          />
          <FieldError name="reference" fieldErrors={state.fieldErrors} />
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-base font-medium">
          Notes
        </label>
        <Textarea id="notes" name="notes" rows={3} />
        <FieldError name="notes" fieldErrors={state.fieldErrors} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Allocate to invoices</h2>
        <p className="text-xs text-muted-foreground">
          Allocation cannot exceed an invoice’s outstanding or the payment amount. Allocate
          the full amount received.
        </p>
        <FieldError name="allocations" fieldErrors={state.fieldErrors} />

        {invoices.length === 0 ? (
          <p className="text-base text-muted-foreground">
            This customer has no unpaid invoices.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-sm font-medium">
              <span>Invoice</span>
              <span className="text-right">Outstanding</span>
              <span className="text-right">Allocate</span>
            </div>
            {invoices.map((invoice, index) => (
              <div
                key={invoice.invoiceId}
                className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <input
                  type="hidden"
                  name={`allocation-${index}-invoiceId`}
                  value={invoice.invoiceId}
                />
                <div>
                  <p className="font-mono text-sm font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{invoice.issuedOn}</p>
                </div>
                <div className="text-right">
                  <MoneyDisplay value={invoice.outstanding} />
                </div>
                <Input
                  name={`allocation-${index}-amount`}
                  inputMode="decimal"
                  className="text-right"
                  placeholder="0.00"
                  value={allocations[invoice.invoiceId] ?? ""}
                  onChange={(event) =>
                    setAllocations((current) => ({
                      ...current,
                      [invoice.invoiceId]: event.target.value,
                    }))
                  }
                  aria-label={`Allocate to ${invoice.invoiceNumber}`}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-md border border-border bg-muted/30 p-4 text-base">
        <p className="font-medium">What will happen</p>
        <p className="mt-2 text-muted-foreground">
          Record {formatINR(money(paymentMinor))} from{" "}
          {selectedCustomer?.name ?? "this customer"}. {formatINR(money(allocatedMinor))}{" "}
          will be allocated to invoices, invoice payment status will update, and a balanced
          receipt journal will be posted.
        </p>
      </section>

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isPending || invoices.length === 0}>
          {isPending ? "Recording payment…" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
