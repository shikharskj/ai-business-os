"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  createQuotationAction,
  previewQuotationTotalsAction,
  updateQuotationAction,
  type QuotationActionState,
} from "@/app/app/(workspace)/sales/quotations/actions";
import {
  DOCUMENT_PREVIEW_ASIDE_CLASSNAME,
  documentPreviewAsideStyle,
  QuotationDocumentPreview,
} from "@/components/business/quotation-document";
import { lineSubtotalBeforeGstMajor } from "@/components/business/line-subtotal-label";
import { DatePicker } from "@/components/date-picker";
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
import { Textarea } from "@/components/ui/textarea";
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import { gstinStateCode, stateCodeFromName } from "@/modules/tax/domain/gstin";
import { toMajorString } from "@/modules/shared-kernel/money";
import { toQuantityMajorString } from "@/modules/inventory/domain/quantity";
import {
  buildQuotationDocumentView,
  quantityLabelFromDraft,
  type QuotationDocumentView,
} from "@/modules/sales/application/quotation-document-view";
import type { Quotation } from "@/modules/sales/domain/types";
import type { BusinessProfile } from "@/modules/tenant/domain/types";

export type QuotationCustomerOption = {
  id: string;
  name: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export type QuotationProductOption = {
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
  seller,
  logoUrl,
}: {
  customers: QuotationCustomerOption[];
  products: QuotationProductOption[];
  today: string;
  quotation?: Quotation;
  seller: BusinessProfile;
  logoUrl: string | null;
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
  const [issuedOn, setIssuedOn] = useState(quotation?.issuedOn ?? today);
  const [validUntil, setValidUntil] = useState(quotation?.validUntil ?? "");
  const [notes, setNotes] = useState(quotation?.notes ?? "");
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
  const [engineView, setEngineView] = useState<QuotationDocumentView | null>(null);

  const stateItems = useMemo(() => GST_STATE_CODES, []);
  const selectedCustomer = customers.find((row) => row.id === customerId) ?? null;

  const draftLines = useMemo(
    () =>
      lines.map((line) => {
        const product = products.find((row) => row.id === line.productId);
        return {
          description: product?.name ?? "Select a product",
          hsnSac: product?.hsnSac ?? null,
          quantityLabel: quantityLabelFromDraft({
            quantity: line.quantity,
            unitOfMeasurement: product?.unitOfMeasurement ?? "",
          }),
          unitPrice: line.unitPrice ? `₹${line.unitPrice}` : "—",
          discount: line.discount ? `₹${line.discount}` : "₹0.00",
        };
      }),
    [lines, products]
  );

  const localView = useMemo(
    () =>
      buildQuotationDocumentView({
        number: quotation?.number ?? "Draft",
        issuedOn,
        validUntil: validUntil || null,
        notes: notes || null,
        placeOfSupplyStateCode: placeOfSupply,
        seller,
        buyer: selectedCustomer,
        logoUrl,
        draftLines,
      }),
    [draftLines, issuedOn, logoUrl, notes, placeOfSupply, quotation?.number, selectedCustomer, seller, validUntil]
  );

  const preview = engineView
    ? {
        ...engineView,
        issuedOn: localView.issuedOn,
        validUntil: localView.validUntil,
        notes: localView.notes,
        placeOfSupply: localView.placeOfSupply,
        seller: localView.seller,
        buyer: localView.buyer,
        logoUrl: localView.logoUrl,
        lettermark: localView.lettermark,
      }
    : localView;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void previewQuotationTotalsAction({
        quotationId: quotation?.id,
        number: quotation?.number,
        customerId,
        issuedOn,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        placeOfSupplyStateCode: placeOfSupply,
        lines,
      }).then((result) => {
        if (cancelled) {
          return;
        }
        if (result.error || !result.view) {
          setEngineView(null);
        } else {
          setEngineView(result.view);
        }
      }).catch(() => {
        if (cancelled) {
          return;
        }
        setEngineView(null);
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [customerId, issuedOn, lines, notes, placeOfSupply, quotation?.id, quotation?.number, validUntil]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      )
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,34rem)]">
      <form action={formAction} className="flex flex-col gap-6">
        {quotation ? (
          <input type="hidden" name="quotationId" value={quotation.id} />
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
                href="/app/sales/customers/new"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                New customer
              </Link>
            </div>
            <Combobox
              id="customerId"
              value={customerId}
              onValueChange={(value) => {
                setCustomerId(value);
                setPlaceOfSupply(
                  customerPlaceOfSupply(customers.find((row) => row.id === value))
                );
              }}
              options={customers.map((customer) => ({
                value: customer.id,
                label: customer.name,
                keywords: [customer.gstin ?? "", customer.phone ?? ""].join(" "),
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
            <DatePicker
              id="issuedOn"
              value={issuedOn}
              onValueChange={setIssuedOn}
              placeholder="Quotation date"
            />
            <input type="hidden" name="issuedOn" value={issuedOn} />
            <FieldError name="issuedOn" fieldErrors={state.fieldErrors} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="validUntil" className="text-base font-medium">
              Valid until
            </label>
            <DatePicker
              id="validUntil"
              value={validUntil}
              onValueChange={setValidUntil}
              placeholder="Valid until (optional)"
            />
            <input type="hidden" name="validUntil" value={validUntil} />
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
                className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]"
              >
                <input
                  type="hidden"
                  name={`line-${index}-productId`}
                  value={line.productId}
                />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-base font-medium" htmlFor={`line-${index}-product`}>
                      Product / service
                    </label>
                    <Link
                      href="/app/inventory/products/new"
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
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
                  <FieldError name={`lines.${index}.productId`} fieldErrors={state.fieldErrors} />
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
                  <FieldError name={`lines.${index}.quantity`} fieldErrors={state.fieldErrors} />
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
                  <FieldError name={`lines.${index}.unitPrice`} fieldErrors={state.fieldErrors} />
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
                  <FieldError name={`lines.${index}.discount`} fieldErrors={state.fieldErrors} />
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
          <Textarea
            id="notes"
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
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

      <aside
        className={DOCUMENT_PREVIEW_ASIDE_CLASSNAME}
        style={documentPreviewAsideStyle}
      >
        <p className="mb-2 text-sm font-medium text-muted-foreground">Preview</p>
        <div className="max-h-[min(70vh,36rem)] overflow-auto rounded-xl bg-muted/40 p-2">
          <QuotationDocumentPreview view={preview} />
        </div>
      </aside>
    </div>
  );
}
