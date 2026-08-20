"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  createQuotationAction,
  updateQuotationAction,
  type QuotationActionState,
} from "@/app/app/(workspace)/sales/quotations/actions";
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
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import { gstinStateCode, stateCodeFromName } from "@/modules/tax/domain/gstin";
import { toMajorString } from "@/modules/shared-kernel/money";
import { toQuantityMajorString } from "@/modules/inventory/domain/quantity";
import type { Quotation } from "@/modules/sales/domain/types";

export type QuotationCustomerOption = {
  id: string;
  name: string;
  gstin: string | null;
  state: string | null;
};

export type QuotationProductOption = {
  id: string;
  name: string;
  sku: string;
  unitOfMeasurement: string;
  sellingPriceMajor: string;
};

type LineDraft = {
  productId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
};

const emptyLine: LineDraft = {
  productId: "",
  quantity: "1",
  unitPrice: "",
  discount: "0",
};

function customerPlaceOfSupply(customer: QuotationCustomerOption | undefined): string {
  if (!customer) {
    return "";
  }
  if (customer.gstin) {
    try {
      return gstinStateCode(customer.gstin);
    } catch {
      // Fall through to the customer's state name.
    }
  }
  if (customer.state) {
    return stateCodeFromName(customer.state) ?? "";
  }
  return "";
}

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

export function QuotationForm({
  customers,
  products,
  today,
  quotation,
}: {
  customers: QuotationCustomerOption[];
  products: QuotationProductOption[];
  today: string;
  quotation?: Quotation;
}) {
  const action = quotation ? updateQuotationAction : createQuotationAction;
  const [state, formAction, isPending] = useActionState(
    action,
    {} as QuotationActionState
  );
  const [customerId, setCustomerId] = useState(
    quotation?.customerId ?? customers[0]?.id ?? ""
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(
    quotation?.placeOfSupplyStateCode ??
      customerPlaceOfSupply(customers.find((row) => row.id === customerId))
  );
  const [lines, setLines] = useState<LineDraft[]>(
    quotation
      ? quotation.lines.map((line) => ({
          productId: line.productId,
          quantity: toQuantityMajorString(line.quantity)
            .replace(/(\.\d*?)0+$/, "$1")
            .replace(/\.$/, ""),
          unitPrice: toMajorString(line.unitPrice),
          discount: toMajorString(line.discount),
        }))
      : [{ ...emptyLine, productId: products[0]?.id ?? "", unitPrice: products[0]?.sellingPriceMajor ?? "" }]
  );

  const customerItems = useMemo(
    () => Object.fromEntries(customers.map((customer) => [customer.id, customer.name])),
    [customers]
  );
  const stateItems = useMemo(() => GST_STATE_CODES, []);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      )
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {quotation ? (
        <input type="hidden" name="quotationId" value={quotation.id} />
      ) : null}
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="placeOfSupplyStateCode" value={placeOfSupply} />
      <input type="hidden" name="lineCount" value={String(lines.length)} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="customerId" className="text-base font-medium">
            Customer
          </label>
          <Select
            value={customerId}
            onValueChange={(value) => {
              const next = String(value ?? "");
              setCustomerId(next);
              setPlaceOfSupply(
                customerPlaceOfSupply(customers.find((row) => row.id === next))
              );
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
          <label htmlFor="placeOfSupplyStateCode" className="text-base font-medium">
            Place of supply
          </label>
          <Select
            value={placeOfSupply}
            onValueChange={(value) => setPlaceOfSupply(String(value ?? ""))}
            items={stateItems}
          >
            <SelectTrigger id="placeOfSupplyStateCode" className="w-full">
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GST_STATE_CODES).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError
            name="placeOfSupplyStateCode"
            fieldErrors={state.fieldErrors}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="issuedOn" className="text-base font-medium">
            Quotation date
          </label>
          <Input
            id="issuedOn"
            name="issuedOn"
            type="date"
            required
            defaultValue={quotation?.issuedOn ?? today}
          />
          <FieldError name="issuedOn" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="validUntil" className="text-base font-medium">
            Valid until
          </label>
          <Input
            id="validUntil"
            name="validUntil"
            type="date"
            defaultValue={quotation?.validUntil ?? ""}
          />
          <FieldError name="validUntil" fieldErrors={state.fieldErrors} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-medium">Lines</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setLines((current) => [
                ...current,
                {
                  ...emptyLine,
                  productId: products[0]?.id ?? "",
                  unitPrice: products[0]?.sellingPriceMajor ?? "",
                },
              ])
            }
          >
            <Plus className="size-5" />
            Add line
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          GST is calculated by the tax engine when you save. Do not enter tax amounts here.
        </p>
        <FieldError name="lines" fieldErrors={state.fieldErrors} />

        <div className="flex flex-col gap-4">
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
            >
              <input
                type="hidden"
                name={`line-${index}-productId`}
                value={line.productId}
              />
              <div className="flex flex-col gap-2">
                <label className="text-base font-medium" htmlFor={`line-${index}-product`}>
                  Product / service
                </label>
                <Select
                  value={line.productId}
                  onValueChange={(value) => {
                    const productId = String(value ?? "");
                    const product = products.find((row) => row.id === productId);
                    updateLine(index, {
                      productId,
                      unitPrice: product?.sellingPriceMajor ?? line.unitPrice,
                    });
                  }}
                  items={Object.fromEntries(
                    products.map((product) => [
                      product.id,
                      `${product.name} (${product.sku})`,
                    ])
                  )}
                >
                  <SelectTrigger id={`line-${index}-product`} className="w-full">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-base font-medium" htmlFor={`line-${index}-quantity`}>
                  Quantity
                </label>
                <Input
                  id={`line-${index}-quantity`}
                  name={`line-${index}-quantity`}
                  inputMode="decimal"
                  required
                  value={line.quantity}
                  onChange={(event) =>
                    updateLine(index, { quantity: event.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-base font-medium" htmlFor={`line-${index}-unitPrice`}>
                  Rate (₹)
                </label>
                <Input
                  id={`line-${index}-unitPrice`}
                  name={`line-${index}-unitPrice`}
                  inputMode="decimal"
                  required
                  value={line.unitPrice}
                  onChange={(event) =>
                    updateLine(index, { unitPrice: event.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-base font-medium" htmlFor={`line-${index}-discount`}>
                  Discount (₹)
                </label>
                <Input
                  id={`line-${index}-discount`}
                  name={`line-${index}-discount`}
                  inputMode="decimal"
                  value={line.discount}
                  onChange={(event) =>
                    updateLine(index, { discount: event.target.value })
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={lines.length === 1}
                  aria-label="Remove line"
                  onClick={() =>
                    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
                  }
                >
                  <Trash2 className="size-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-base font-medium">
          Notes
        </label>
        <Textarea id="notes" name="notes" defaultValue={quotation?.notes ?? ""} />
      </div>

      {state.error ? (
        <p className="text-base text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending || customers.length === 0 || products.length === 0}>
        {isPending
          ? "Saving…"
          : quotation
            ? "Save quotation"
            : "Create quotation"}
      </Button>
    </form>
  );
}
