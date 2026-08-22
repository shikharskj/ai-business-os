"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  createPurchaseAction,
  updatePurchaseAction,
  type PurchaseActionState,
} from "@/app/app/(workspace)/purchases/bills/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import {
  buildEntityCreateHref,
  resolveInitialEntityId,
} from "@/lib/navigation/entity-create-return";
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
import type { Purchase } from "@/modules/purchases/domain/types";

export type BillSupplierOption = {
  id: string;
  name: string;
  gstin: string | null;
  state: string | null;
};

export type BillProductOption = {
  id: string;
  name: string;
  sku: string;
  unitOfMeasurement: string;
  purchasePriceMajor: string;
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

function supplierPlaceOfSupply(supplier: BillSupplierOption | undefined): string {
  if (!supplier) {
    return "";
  }
  if (supplier.gstin) {
    try {
      return gstinStateCode(supplier.gstin);
    } catch {
      // Fall through to the supplier's state name.
    }
  }
  if (supplier.state) {
    return stateCodeFromName(supplier.state) ?? "";
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

function buildInitialBillLines(
  products: BillProductOption[],
  initialProductId?: string,
  initialLineIndex?: number
): LineDraft[] {
  const firstProduct = products[0];
  const lines: LineDraft[] = [
    {
      ...emptyLine,
      productId: firstProduct?.id ?? "",
      unitPrice: firstProduct?.purchasePriceMajor ?? "",
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
      unitPrice: firstProduct?.purchasePriceMajor ?? "",
    });
  }

  lines[lineIndex] = {
    ...lines[lineIndex],
    productId: product.id,
    unitPrice: product.purchasePriceMajor,
  };
  return lines;
}

export function BillForm({
  suppliers,
  products,
  today,
  purchase,
  initialSupplierId,
  initialProductId,
  initialLineIndex,
}: {
  suppliers: BillSupplierOption[];
  products: BillProductOption[];
  today: string;
  purchase?: Purchase;
  initialSupplierId?: string;
  initialProductId?: string;
  initialLineIndex?: number;
}) {
  const action = purchase ? updatePurchaseAction : createPurchaseAction;
  const [state, formAction, isPending] = useActionState(
    action,
    {} as PurchaseActionState
  );
  const [supplierId, setSupplierId] = useState(
    purchase?.supplierId ??
      resolveInitialEntityId(suppliers, initialSupplierId)
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(
    purchase?.placeOfSupplyStateCode ??
      supplierPlaceOfSupply(suppliers.find((row) => row.id === supplierId))
  );
  const [lines, setLines] = useState<LineDraft[]>(
    purchase
      ? purchase.lines.map((line) => ({
          productId: line.productId,
          quantity: toQuantityMajorString(line.quantity)
            .replace(/(\.\d*?)0+$/, "$1")
            .replace(/\.$/, ""),
          unitPrice: toMajorString(line.unitPrice),
          discount: toMajorString(line.discount),
        }))
      : buildInitialBillLines(products, initialProductId, initialLineIndex)
  );

  const supplierItems = useMemo(
    () => Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier.name])),
    [suppliers]
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
      {purchase ? (
        <input type="hidden" name="purchaseId" value={purchase.id} />
      ) : null}
      <input type="hidden" name="supplierId" value={supplierId} />
      <input type="hidden" name="placeOfSupplyStateCode" value={placeOfSupply} />
      <input type="hidden" name="lineCount" value={String(lines.length)} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="supplierId" className="text-base font-medium">
              Supplier
            </label>
            <Link
              href={buildEntityCreateHref({
                entity: "supplier",
                returnTo: "/app/purchases/bills/new",
                preserveQuery: supplierId ? { supplierId } : undefined,
              })}
              className="flex items-center gap-2 text-sm font-medium text-(--state-info) hover:font-semibold"
            >
              <Plus className="size-4" />
              <span>New supplier</span>
            </Link>
          </div>
          <Select
            value={supplierId}
            onValueChange={(value) => {
              const next = String(value ?? "");
              setSupplierId(next);
              setPlaceOfSupply(
                supplierPlaceOfSupply(suppliers.find((row) => row.id === next))
              );
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
            Bill date
          </label>
          <Input
            id="issuedOn"
            name="issuedOn"
            type="date"
            required
            defaultValue={purchase?.issuedOn ?? today}
          />
          <FieldError name="issuedOn" fieldErrors={state.fieldErrors} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="dueOn" className="text-base font-medium">
            Due date
          </label>
          <Input
            id="dueOn"
            name="dueOn"
            type="date"
            defaultValue={purchase?.dueOn ?? ""}
          />
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
                  unitPrice: products[0]?.purchasePriceMajor ?? "",
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
                <div className="flex items-center justify-between gap-2">
                  <label className="text-base font-medium" htmlFor={`line-${index}-product`}>
                    Product / service
                  </label>
                  <Link
                    href={buildEntityCreateHref({
                      entity: "product",
                      returnTo: "/app/purchases/bills/new",
                      preserveQuery: {
                        supplierId: supplierId || undefined,
                        lineIndex: String(index),
                      },
                    })}
                    className="flex items-center gap-2 text-xs font-medium text-(--state-info) hover:font-semibold"
                  >
                    <Plus className="size-4" />
                    New product
                  </Link>
                </div>
                <Select
                  value={line.productId}
                  onValueChange={(value) => {
                    const productId = String(value ?? "");
                    const product = products.find((row) => row.id === productId);
                    updateLine(index, {
                      productId,
                      unitPrice: product?.purchasePriceMajor ?? line.unitPrice,
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
          defaultValue={purchase?.notes ?? ""}
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
        disabled={suppliers.length === 0 || products.length === 0}
      >
        {purchase ? "Save bill" : "Create bill"}
      </SubmitButton>
    </form>
  );
}
