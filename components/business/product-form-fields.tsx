"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATALOG_UNITS } from "@/modules/catalog";
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
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

function Field({
  label,
  name,
  children,
  fieldErrors,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      <FieldError name={name} fieldErrors={fieldErrors} />
    </div>
  );
}

function gstRateLabel(bps: number): string {
  return `${bps / 100}%`;
}

export type ProductFormValues = {
  kind?: "PRODUCT" | "SERVICE";
  name?: string;
  sku?: string;
  unitOfMeasurement?: string;
  sellingPrice?: string;
  purchasePrice?: string;
  hsnSac?: string;
  taxRateBps?: string;
  category?: string;
  tracksInventory?: boolean;
};

export function ProductFormFields({
  defaultValues,
  fieldErrors,
}: {
  defaultValues?: ProductFormValues;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Item details</h2>
        <Field label="Type" name="kind" fieldErrors={fieldErrors}>
          <Select name="kind" defaultValue={defaultValues?.kind ?? "PRODUCT"}>
            <SelectTrigger id="kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRODUCT">Product</SelectItem>
              <SelectItem value="SERVICE">Service</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Name" name="name" fieldErrors={fieldErrors}>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaultValues?.name ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU / item code" name="sku" fieldErrors={fieldErrors}>
            <Input
              id="sku"
              name="sku"
              required
              defaultValue={defaultValues?.sku ?? ""}
            />
          </Field>
          <Field label="Category" name="category" fieldErrors={fieldErrors}>
            <Input
              id="category"
              name="category"
              defaultValue={defaultValues?.category ?? ""}
            />
          </Field>
        </div>
        <Field
          label="Unit of measurement"
          name="unitOfMeasurement"
          fieldErrors={fieldErrors}
        >
          <Select
            name="unitOfMeasurement"
            defaultValue={defaultValues?.unitOfMeasurement ?? "PCS"}
          >
            <SelectTrigger id="unitOfMeasurement" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATALOG_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Prices</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Selling price (₹)"
            name="sellingPrice"
            fieldErrors={fieldErrors}
          >
            <Input
              id="sellingPrice"
              name="sellingPrice"
              inputMode="decimal"
              required
              defaultValue={defaultValues?.sellingPrice ?? ""}
            />
          </Field>
          <Field
            label="Purchase price (₹)"
            name="purchasePrice"
            fieldErrors={fieldErrors}
          >
            <Input
              id="purchasePrice"
              name="purchasePrice"
              inputMode="decimal"
              required
              defaultValue={defaultValues?.purchasePrice ?? ""}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Tax</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="HSN / SAC" name="hsnSac" fieldErrors={fieldErrors}>
            <Input
              id="hsnSac"
              name="hsnSac"
              defaultValue={defaultValues?.hsnSac ?? ""}
              placeholder="4 to 8 digits"
            />
          </Field>
          <Field label="GST rate" name="taxRateBps" fieldErrors={fieldErrors}>
            <Select
              name="taxRateBps"
              defaultValue={defaultValues?.taxRateBps ?? "1800"}
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
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Inventory</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="tracksInventory"
            defaultChecked={defaultValues?.tracksInventory ?? false}
            className="size-4 accent-primary"
          />
          Track inventory for this product
        </label>
        <p className="text-xs text-muted-foreground">
          Services never track stock. Stock quantities appear after inventory
          movements are recorded.
        </p>
      </section>
    </div>
  );
}
