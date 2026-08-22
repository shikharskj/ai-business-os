"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  createInvoiceAction,
  previewInvoiceTotalsAction,
  updateInvoiceAction,
  type InvoiceActionState,
} from "@/app/app/(workspace)/sales/invoices/actions";
import {
  InvoiceDocumentPreview,
} from "@/components/business/invoice-document";
import {
  DocumentFormPreviewAside,
  DocumentFormPreviewLayout,
  DocumentFormPreviewMain,
} from "@/components/shell/document-form-preview-layout";
import { lineSubtotalBeforeGstMajor } from "@/components/business/line-subtotal-label";
import { DatePicker } from "@/components/date-picker";
import { SubmitButton } from "@/components/ui/submit-button";
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
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import { gstinStateCode, stateCodeFromName } from "@/modules/tax/domain/gstin";
import { toMajorString } from "@/modules/shared-kernel/money";
import { toQuantityMajorString } from "@/modules/inventory/domain/quantity";
import {
  buildInvoiceDocumentView,
  quantityLabelFromDraft,
  type InvoiceDocumentView,
} from "@/modules/sales/application/invoice-document-view";
import type { SalesInvoice } from "@/modules/sales/domain/types";
import type { BusinessProfile } from "@/modules/tenant/domain/types";

export type InvoiceCustomerOption = {
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

export type InvoiceProductOption = {
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

function customerPlaceOfSupply(customer: InvoiceCustomerOption | undefined): string {
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

export function InvoiceForm({
  customers,
  products,
  today,
  invoice,
  seller,
  logoUrl,
}: {
  customers: InvoiceCustomerOption[];
  products: InvoiceProductOption[];
  today: string;
  invoice?: SalesInvoice;
  seller: BusinessProfile;
  logoUrl: string | null;
}) {
  const action = invoice ? updateInvoiceAction : createInvoiceAction;
  const [state, formAction, isPending] = useActionState(
    action,
    {} as InvoiceActionState
  );
  const [customerId, setCustomerId] = useState(
    invoice?.customerId ?? customers[0]?.id ?? ""
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(
    invoice?.placeOfSupplyStateCode ??
      customerPlaceOfSupply(customers.find((row) => row.id === customerId))
  );
  const [placeOfSupplyTouched, setPlaceOfSupplyTouched] = useState(
    Boolean(invoice?.placeOfSupplyStateCode)
  );
  const [issuedOn, setIssuedOn] = useState(invoice?.issuedOn ?? today);
  const [dueOn, setDueOn] = useState(invoice?.dueOn ?? "");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    invoice
      ? invoice.lines.map((line) => ({
          productId: line.productId,
          quantity: toQuantityMajorString(line.quantity)
            .replace(/(\.\d*?)0+$/, "$1")
            .replace(/\.$/, ""),
          unitPrice: toMajorString(line.unitPrice),
          discount: toMajorString(line.discount),
        }))
      : [{ ...emptyLine, productId: products[0]?.id ?? "", unitPrice: products[0]?.sellingPriceMajor ?? "" }]
  );
  const [engineView, setEngineView] = useState<InvoiceDocumentView | null>(null);

  const stateItems = useMemo(() => GST_STATE_CODES, []);
  const selectedCustomer = customers.find((row) => row.id === customerId) ?? null;

  const draftLines = useMemo(
    () =>
      lines.map((line) => {
        const product = products.find((row) => row.id === line.productId);
        const formatDraftMoney = (value: string) => {
          if (!value || value === "0") {
            return "INR 0.00";
          }
          try {
            const [intPart = "0", fracPart = ""] = value.split(".");
            const paddedFrac = (fracPart + "00").slice(0, 2);
            const digits = intPart.replace(/^0+(?=\d)/, "") || "0";
            let grouped: string;
            if (digits.length <= 3) {
              grouped = digits;
            } else {
              const lastThree = digits.slice(-3);
              let rest = digits.slice(0, -3);
              const groups: string[] = [];
              while (rest.length > 2) {
                groups.unshift(rest.slice(-2));
                rest = rest.slice(0, -2);
              }
              if (rest.length > 0) {
                groups.unshift(rest);
              }
              grouped = `${groups.join(",")},${lastThree}`;
            }
            return `INR ${grouped}.${paddedFrac}`;
          } catch {
            return `INR ${value}`;
          }
        };
        return {
          description: product?.name ?? "Select a product",
          hsnSac: product?.hsnSac ?? null,
          quantityLabel: quantityLabelFromDraft({
            quantity: line.quantity,
            unitOfMeasurement: product?.unitOfMeasurement ?? "",
          }),
          unitPrice: line.unitPrice ? formatDraftMoney(line.unitPrice) : "—",
          discount: line.discount && line.discount !== "0" ? formatDraftMoney(line.discount) : "INR 0.00",
        };
      }),
    [lines, products]
  );

  const localView = useMemo(
    () =>
      buildInvoiceDocumentView({
        number: invoice?.number ?? "Draft",
        issuedOn,
        dueOn: dueOn || null,
        notes: notes || null,
        placeOfSupplyStateCode: placeOfSupply,
        seller,
        buyer: selectedCustomer,
        logoUrl,
        draftLines,
      }),
    [draftLines, dueOn, invoice?.number, issuedOn, logoUrl, notes, placeOfSupply, selectedCustomer, seller]
  );

  const preview = engineView
    ? {
        ...engineView,
        issuedOn: localView.issuedOn,
        dueOn: localView.dueOn,
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
      void previewInvoiceTotalsAction({
        invoiceId: invoice?.id,
        number: invoice?.number,
        customerId,
        issuedOn,
        dueOn: dueOn || undefined,
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
  }, [customerId, dueOn, invoice?.id, invoice?.number, issuedOn, lines, notes, placeOfSupply]);

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
        {invoice ? (
          <input type="hidden" name="invoiceId" value={invoice.id} />
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
                if (!placeOfSupplyTouched) {
                  setPlaceOfSupply(
                    customerPlaceOfSupply(customers.find((row) => row.id === value))
                  );
                }
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
              Invoice date
            </label>
            <DatePicker
              id="issuedOn"
              value={issuedOn}
              onValueChange={setIssuedOn}
              placeholder="Invoice date"
            />
            <input type="hidden" name="issuedOn" value={issuedOn} />
            <FieldError name="issuedOn" fieldErrors={state.fieldErrors} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="dueOn" className="text-base font-medium">
              Due date
            </label>
            <DatePicker
              id="dueOn"
              value={dueOn}
              onValueChange={setDueOn}
              placeholder="Due date (optional)"
            />
            <input type="hidden" name="dueOn" value={dueOn} />
            <FieldError name="dueOn" fieldErrors={state.fieldErrors} />
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
                <div className="flex flex-col gap-2 md:col-span-1">
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
                    placeholder={FORM_PLACEHOLDERS.quantity}
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
                    placeholder={FORM_PLACEHOLDERS.rate}
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
                    placeholder={FORM_PLACEHOLDERS.discount}
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
          {invoice ? "Save invoice" : "Create invoice"}
        </SubmitButton>
      </form>
      </DocumentFormPreviewMain>

      <DocumentFormPreviewAside>
        <p className="mb-2 text-sm font-medium text-muted-foreground">Preview</p>
        <div className="max-h-[min(70vh,36rem)] overflow-auto rounded-xl bg-muted/40 p-2">
          <InvoiceDocumentPreview view={preview} />
        </div>
      </DocumentFormPreviewAside>
    </DocumentFormPreviewLayout>
  );
}
