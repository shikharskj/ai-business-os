"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  createSalesOrderAction,
  previewSalesOrderTotalsAction,
  updateSalesOrderAction,
  type SalesOrderActionState,
  type SalesOrderPreviewState,
} from "@/app/app/(workspace)/sales/orders/actions";
import { GstBreakdown } from "@/components/business/gst-breakdown";
import { lineSubtotalBeforeGstMajor } from "@/components/business/line-subtotal-label";
import { DatePicker } from "@/components/date-picker";
import {
  DocumentFormPreviewAside,
  DocumentFormPreviewLayout,
  DocumentFormPreviewMain,
} from "@/components/shell/document-form-preview-layout";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import {
  buildEntityCreateHref,
  resolveInitialEntityId,
} from "@/lib/navigation/entity-create-return";
import { toQuantityMajorString } from "@/modules/inventory/domain/quantity";
import { moneyFromMajor, toMajorString } from "@/modules/shared-kernel/money";
import { GST_STATE_CODES, gstinStateCode, stateCodeFromName } from "@/modules/tax/domain/gstin";
import type { SalesOrder } from "@/modules/sales/domain/types";

export type SalesOrderCustomerOption = {
  id: string;
  name: string;
  gstin: string | null;
  state: string | null;
};

export type SalesOrderProductOption = {
  id: string;
  name: string;
  sku: string;
  unitOfMeasurement: string;
  sellingPriceMajor: string;
  hsnSac: string | null;
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

function customerPlaceOfSupply(customer: SalesOrderCustomerOption | undefined): string {
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

function buildInitialLines(
  products: SalesOrderProductOption[],
  initialProductId?: string,
  initialLineIndex?: number
): LineDraft[] {
  const firstProduct = products[0];
  const lines: LineDraft[] = [
    {
      ...emptyLine,
      productId: firstProduct?.id ?? "",
      unitPrice: firstProduct?.sellingPriceMajor ?? "",
    },
  ];

  if (!initialProductId || !products.some((row) => row.id === initialProductId)) {
    return lines;
  }

  const product = products.find((row) => row.id === initialProductId);
  if (!product) {
    return lines;
  }

  const lineIndex = initialLineIndex ?? 0;
  while (lines.length <= lineIndex) {
    lines.push({
      ...emptyLine,
      productId: firstProduct?.id ?? "",
      unitPrice: firstProduct?.sellingPriceMajor ?? "",
    });
  }

  lines[lineIndex] = {
    ...lines[lineIndex],
    productId: product.id,
    unitPrice: product.sellingPriceMajor,
  };
  return lines;
}

export function SalesOrderForm({
  customers,
  products,
  today,
  salesOrder,
  initialCustomerId,
  initialProductId,
  initialLineIndex,
}: {
  customers: SalesOrderCustomerOption[];
  products: SalesOrderProductOption[];
  today: string;
  salesOrder?: SalesOrder;
  initialCustomerId?: string;
  initialProductId?: string;
  initialLineIndex?: number;
}) {
  const action = salesOrder ? updateSalesOrderAction : createSalesOrderAction;
  const [state, formAction, isPending] = useActionState(
    action,
    {} as SalesOrderActionState
  );
  const [customerId, setCustomerId] = useState(
    salesOrder?.customerId ?? resolveInitialEntityId(customers, initialCustomerId)
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(
    salesOrder?.placeOfSupplyStateCode ??
      customerPlaceOfSupply(customers.find((row) => row.id === customerId))
  );
  const [placeOfSupplyTouched, setPlaceOfSupplyTouched] = useState(
    Boolean(salesOrder?.placeOfSupplyStateCode)
  );
  const [issuedOn, setIssuedOn] = useState(salesOrder?.issuedOn ?? today);
  const [expectedOn, setExpectedOn] = useState(salesOrder?.expectedOn ?? "");
  const [notes, setNotes] = useState(salesOrder?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    salesOrder
      ? salesOrder.lines.map((line) => ({
          productId: line.productId,
          quantity: toQuantityMajorString(line.quantity)
            .replace(/(\.\d*?)0+$/, "$1")
            .replace(/\.$/, ""),
          unitPrice: toMajorString(line.unitPrice),
          discount: toMajorString(line.discount),
        }))
      : buildInitialLines(products, initialProductId, initialLineIndex)
  );
  const [preview, setPreview] = useState<SalesOrderPreviewState>({});

  const stateItems = useMemo(() => GST_STATE_CODES, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void previewSalesOrderTotalsAction({
        salesOrderId: salesOrder?.id,
        customerId,
        issuedOn,
        expectedOn: expectedOn || undefined,
        notes: notes || undefined,
        placeOfSupplyStateCode: placeOfSupply,
        lines,
      }).then((result) => {
        if (!cancelled) {
          setPreview(result);
        }
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [customerId, expectedOn, issuedOn, lines, notes, placeOfSupply, salesOrder?.id]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      )
    );
  }

  return (
    <DocumentFormPreviewLayout>
      <DocumentFormPreviewMain>
        <form action={formAction} className="flex w-full min-w-0 flex-col gap-6">
          {salesOrder ? (
            <input type="hidden" name="salesOrderId" value={salesOrder.id} />
          ) : null}
          <input type="hidden" name="customerId" value={customerId} />
          <input type="hidden" name="placeOfSupplyStateCode" value={placeOfSupply} />
          <input type="hidden" name="lineCount" value={String(lines.length)} />

          <section className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="customerId" className="text-base font-medium">
                  Customer
                </label>
                <Link
                  href={buildEntityCreateHref({
                    entity: "customer",
                    returnTo: "/app/sales/orders/new",
                    preserveQuery: customerId ? { customerId } : undefined,
                  })}
                  className="flex items-center gap-2 text-sm font-medium text-(--state-info) hover:font-semibold"
                >
                  <Plus className="size-4" />
                  New customer
                </Link>
              </div>
              <Combobox
                id="customerId"
                value={customerId}
                onValueChange={(value) => {
                  setCustomerId(value);
                  if (!placeOfSupplyTouched) {
                    setPlaceOfSupply(
                      customerPlaceOfSupply(customers.find((row) => row.id === value))
                    );
                  }
                }}
                options={customers.map((customer) => ({
                  value: customer.id,
                  label: customer.name,
                  keywords: customer.gstin ?? "",
                }))}
                placeholder="Select a customer"
                searchPlaceholder="Search customers…"
              />
              <FieldError name="customerId" fieldErrors={state.fieldErrors} />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="placeOfSupplyStateCode" className="text-base font-medium">
                Place of supply
              </label>
              <Select
                value={placeOfSupply}
                onValueChange={(value) => {
                  setPlaceOfSupply(String(value ?? ""));
                  setPlaceOfSupplyTouched(true);
                }}
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
                Order date
              </label>
              <DatePicker
                id="issuedOn"
                value={issuedOn}
                onValueChange={setIssuedOn}
                placeholder="Order date"
              />
              <input type="hidden" name="issuedOn" value={issuedOn} />
              <FieldError name="issuedOn" fieldErrors={state.fieldErrors} />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="expectedOn" className="text-base font-medium">
                Expected on
              </label>
              <DatePicker
                id="expectedOn"
                value={expectedOn}
                onValueChange={setExpectedOn}
                placeholder="Expected date (optional)"
              />
              <input type="hidden" name="expectedOn" value={expectedOn} />
              <FieldError name="expectedOn" fieldErrors={state.fieldErrors} />
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
              GST is calculated by the tax engine when you save. Confirming an order does not
              move stock or post accounts.
            </p>
            <FieldError name="lines" fieldErrors={state.fieldErrors} />

            <div className="flex flex-col gap-4">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]"
                >
                  <input
                    type="hidden"
                    name={`line-${index}-productId`}
                    value={line.productId}
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        className="text-base font-medium"
                        htmlFor={`line-${index}-product`}
                      >
                        Product / service
                      </label>
                      <Link
                        href={buildEntityCreateHref({
                          entity: "product",
                          returnTo: "/app/sales/orders/new",
                          preserveQuery: {
                            customerId: customerId || undefined,
                            lineIndex: String(index),
                          },
                        })}
                        className="flex items-center gap-2 text-xs font-medium text-(--state-info) hover:font-semibold"
                      >
                        <Plus className="size-4" />
                        New product
                      </Link>
                    </div>
                    <Combobox
                      id={`line-${index}-product`}
                      value={line.productId}
                      onValueChange={(productId) => {
                        const product = products.find((row) => row.id === productId);
                        updateLine(index, {
                          productId,
                          unitPrice: product?.sellingPriceMajor ?? line.unitPrice,
                        });
                      }}
                      options={products.map((product) => ({
                        value: product.id,
                        label: `${product.name} (${product.sku})`,
                        keywords: product.sku,
                      }))}
                      placeholder="Select a product"
                      searchPlaceholder="Search products…"
                    />
                    <FieldError
                      name={`lines.${index}.productId`}
                      fieldErrors={state.fieldErrors}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-base font-medium"
                      htmlFor={`line-${index}-quantity`}
                    >
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
                      placeholder={FORM_PLACEHOLDERS.quantity}
                    />
                    <FieldError
                      name={`lines.${index}.quantity`}
                      fieldErrors={state.fieldErrors}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-base font-medium"
                      htmlFor={`line-${index}-unitPrice`}
                    >
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
                      placeholder={FORM_PLACEHOLDERS.rate}
                    />
                    <FieldError
                      name={`lines.${index}.unitPrice`}
                      fieldErrors={state.fieldErrors}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-base font-medium"
                      htmlFor={`line-${index}-discount`}
                    >
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
                      placeholder={FORM_PLACEHOLDERS.discount}
                    />
                    <FieldError
                      name={`lines.${index}.discount`}
                      fieldErrors={state.fieldErrors}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-base font-medium">Line total (pre-GST)</span>
                    <p className="flex h-10 items-center text-base tabular-nums">
                      ₹{lineSubtotalBeforeGstMajor(line)}
                    </p>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={lines.length === 1}
                      aria-label="Remove line"
                      onClick={() =>
                        setLines((current) =>
                          current.filter((_, lineIndex) => lineIndex !== index)
                        )
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
            <Textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={FORM_PLACEHOLDERS.notes}
            />
          </div>

          {state.error ? (
            <p className="text-base text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <SubmitButton
            pending={isPending}
            pendingLabel="Saving"
            disabled={customers.length === 0 || products.length === 0}
          >
            {salesOrder ? "Save sales order" : "Create sales order"}
          </SubmitButton>
        </form>
      </DocumentFormPreviewMain>

      <DocumentFormPreviewAside>
        <p className="mb-2 text-sm font-medium text-muted-foreground">GST preview</p>
        {preview.taxableAmountMajor && preview.supplyType ? (
          <GstBreakdown
            taxableAmount={moneyFromMajor(preview.taxableAmountMajor)}
            cgst={moneyFromMajor(preview.cgstMajor ?? "0")}
            sgst={moneyFromMajor(preview.sgstMajor ?? "0")}
            igst={moneyFromMajor(preview.igstMajor ?? "0")}
            totalTax={moneyFromMajor(preview.totalTaxMajor ?? "0")}
            grandTotal={moneyFromMajor(preview.grandTotalMajor ?? "0")}
            supplyType={preview.supplyType}
          />
        ) : (
          <p className="text-base text-muted-foreground">
            {preview.error ?? "Select a customer and lines to see GST totals."}
          </p>
        )}
      </DocumentFormPreviewAside>
    </DocumentFormPreviewLayout>
  );
}
