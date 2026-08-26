"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import {
  recordSupplierPaymentAction,
  type SupplierPaymentActionState,
} from "@/app/app/(workspace)/purchases/payments/actions";
import { SubmitButton } from "@/components/ui/submit-button";
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
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import { buildEntityCreateHref } from "@/lib/navigation/entity-create-return";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
  type PurchaseOutstanding,
} from "@/modules/payments/domain/types";

export type PaymentSupplierOption = {
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

type RecordSupplierPaymentFormProps = {
  suppliers: PaymentSupplierOption[];
  purchases: PurchaseOutstanding[];
  today: string;
  selectedSupplierId: string;
  selectedPurchaseId?: string;
};

export function RecordSupplierPaymentForm(props: RecordSupplierPaymentFormProps) {
  return (
    <RecordSupplierPaymentFormFields
      key={`${props.selectedSupplierId}:${props.selectedPurchaseId ?? ""}`}
      {...props}
    />
  );
}

function RecordSupplierPaymentFormFields({
  suppliers,
  purchases,
  today,
  selectedSupplierId,
  selectedPurchaseId,
}: RecordSupplierPaymentFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    recordSupplierPaymentAction,
    {} as SupplierPaymentActionState
  );
  const selectedPurchase = purchases.find(
    (row) => row.purchaseId === selectedPurchaseId
  );
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState(() =>
    selectedPurchase ? toMajorString(selectedPurchase.outstanding) : ""
  );
  const [allocations, setAllocations] = useState<Record<string, string>>(() =>
    selectedPurchase
      ? {
          [selectedPurchase.purchaseId]: toMajorString(
            selectedPurchase.outstanding
          ),
        }
      : {}
  );

  const methodItems = useMemo(
    () =>
      Object.fromEntries(
        PAYMENT_METHODS.map((method) => [method, PAYMENT_METHOD_LABELS[method]])
      ),
    []
  );
  const supplierItems = useMemo(
    () => Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier.name])),
    [suppliers]
  );

  const allocatedMinor = purchases.reduce((sum, purchase) => {
    return sum + parseAmount(allocations[purchase.purchaseId] ?? "");
  }, 0n);
  const paymentMinor = parseAmount(amount);
  const selectedSupplier = suppliers.find(
    (supplier) => supplier.id === selectedSupplierId
  );

  function fillOutstanding() {
    if (selectedPurchase) {
      const outstanding = toMajorString(selectedPurchase.outstanding);
      setAmount(outstanding);
      setAllocations({ [selectedPurchase.purchaseId]: outstanding });
      return;
    }
    const nextAllocations = Object.fromEntries(
      purchases.map((purchase) => [
        purchase.purchaseId,
        toMajorString(purchase.outstanding),
      ])
    );
    const totalMinor = purchases.reduce(
      (sum, purchase) => sum + purchase.outstanding.amountMinor,
      0n
    );
    setAmount(toMajorString(money(totalMinor)));
    setAllocations(nextAllocations);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="supplierId" value={selectedSupplierId} />
      <input type="hidden" name="allocationCount" value={String(purchases.length)} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="supplierId" className="text-base font-medium">
              Supplier
            </label>
            <Link
              href={buildEntityCreateHref({
                entity: "supplier",
                returnTo: "/app/purchases/payments/new",
                preserveQuery: selectedSupplierId
                  ? { supplierId: selectedSupplierId }
                  : undefined,
              })}
              className="flex items-center gap-2 text-sm font-medium text-(--state-info) hover:font-semibold"
            >
              <Plus className="size-4" />
              <span>New supplier</span>
            </Link>
          </div>
          <Select
            value={selectedSupplierId}
            onValueChange={(value) => {
              const next = String(value ?? "");
              router.push(`/app/purchases/payments/new?supplierId=${next}`);
            }}
            items={supplierItems}
          >
            <SelectTrigger id="supplierId" className="w-full">
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError name="supplierId" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="paidOn" className="text-base font-medium">
            Paid on
          </label>
          <Input id="paidOn" name="paidOn" type="date" required defaultValue={today} />
          <FieldError name="paidOn" fieldErrors={state.fieldErrors} />
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
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="amount" className="text-base font-medium">
              Amount paid
            </label>
            {purchases.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={fillOutstanding}>
                Fill outstanding
              </Button>
            ) : null}
          </div>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={FORM_PLACEHOLDERS.price}
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
            placeholder={FORM_PLACEHOLDERS.reference}
          />
          <FieldError name="reference" fieldErrors={state.fieldErrors} />
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-base font-medium">
          Notes
        </label>
        <Textarea id="notes" name="notes" rows={3} placeholder={FORM_PLACEHOLDERS.notes} />
        <FieldError name="notes" fieldErrors={state.fieldErrors} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Allocate to purchase bills</h2>
        <p className="text-xs text-muted-foreground">
          Allocation cannot exceed a bill’s outstanding or the payment amount. Allocate the
          full amount paid.
        </p>
        <FieldError name="allocations" fieldErrors={state.fieldErrors} />

        {purchases.length === 0 ? (
          <p className="text-base text-muted-foreground">
            This supplier has no unpaid purchase bills.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-sm font-medium md:grid">
              <span>Bill</span>
              <span className="text-right">Outstanding</span>
              <span className="text-right">Allocate</span>
            </div>
            {purchases.map((purchase, index) => (
              <div
                key={purchase.purchaseId}
                className="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-b-0 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-3"
              >
                <input
                  type="hidden"
                  name={`allocation-${index}-purchaseId`}
                  value={purchase.purchaseId}
                />
                <div>
                  <p className="font-mono text-sm font-medium">{purchase.purchaseNumber}</p>
                  <p className="text-xs text-muted-foreground">{purchase.issuedOn}</p>
                </div>
                <div className="flex items-center justify-between gap-2 md:block md:text-right">
                  <span className="text-sm text-muted-foreground md:hidden">
                    Outstanding
                  </span>
                  <MoneyDisplay value={purchase.outstanding} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`allocation-${index}-amount`}
                    className="text-sm font-medium md:hidden"
                  >
                    Allocate
                  </label>
                  <Input
                    id={`allocation-${index}-amount`}
                    name={`allocation-${index}-amount`}
                    inputMode="decimal"
                    className="w-full text-right"
                    placeholder="0.00"
                    value={allocations[purchase.purchaseId] ?? ""}
                    onChange={(event) =>
                      setAllocations((current) => ({
                        ...current,
                        [purchase.purchaseId]: event.target.value,
                      }))
                    }
                    aria-label={`Allocate to ${purchase.purchaseNumber}`}
                  />
                  <FieldError
                    name={`allocations.${index}.amount`}
                    fieldErrors={state.fieldErrors}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-md border border-border bg-muted/30 p-4 text-base">
        <p className="font-medium">What will happen</p>
        <p className="mt-2 text-muted-foreground">
          Record {formatINR(money(paymentMinor))} paid to{" "}
          {selectedSupplier?.name ?? "this supplier"}. {formatINR(money(allocatedMinor))}{" "}
          will be allocated to bills, payable status will update, and a balanced payment
          journal will be posted.
        </p>
      </section>

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <SubmitButton
          pending={isPending}
          pendingLabel="Recording payment"
          disabled={purchases.length === 0}
        >
          Record payment
        </SubmitButton>
      </div>
    </form>
  );
}
