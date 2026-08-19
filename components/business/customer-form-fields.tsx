"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";
import type { Customer } from "@/modules/party/domain/types";

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

export function CustomerFormFields({
  defaultValues,
  fieldErrors,
}: {
  defaultValues?: Partial<Customer>;
  fieldErrors?: Record<string, string>;
}) {
  const states = Object.values(GST_STATE_CODES);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Customer details</h2>
        <Field label="Business name" name="name" fieldErrors={fieldErrors}>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaultValues?.name ?? ""}
          />
        </Field>
        <Field label="Phone" name="phone" fieldErrors={fieldErrors}>
          <Input
            id="phone"
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
          />
        </Field>
        <Field label="Email" name="email" fieldErrors={fieldErrors}>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Billing address</h2>
        <Field
          label="Address line 1"
          name="billingAddressLine1"
          fieldErrors={fieldErrors}
        >
          <Input
            id="billingAddressLine1"
            name="billingAddressLine1"
            defaultValue={defaultValues?.billingAddressLine1 ?? ""}
          />
        </Field>
        <Field
          label="Address line 2"
          name="billingAddressLine2"
          fieldErrors={fieldErrors}
        >
          <Input
            id="billingAddressLine2"
            name="billingAddressLine2"
            defaultValue={defaultValues?.billingAddressLine2 ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="city" fieldErrors={fieldErrors}>
            <Input
              id="city"
              name="city"
              defaultValue={defaultValues?.city ?? ""}
            />
          </Field>
          <Field label="State" name="state" fieldErrors={fieldErrors}>
            <Select name="state" defaultValue={defaultValues?.state ?? ""}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="PIN code" name="postalCode" fieldErrors={fieldErrors}>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={defaultValues?.postalCode ?? ""}
            />
          </Field>
          <input type="hidden" name="country" value="IN" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">GST</h2>
        <Field
          label="GST registration"
          name="gstRegistrationStatus"
          fieldErrors={fieldErrors}
        >
          <Select
            name="gstRegistrationStatus"
            defaultValue={defaultValues?.gstRegistrationStatus ?? "NOT_REGISTERED"}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_REGISTERED">Not registered</SelectItem>
              <SelectItem value="REGISTERED">Registered</SelectItem>
              <SelectItem value="COMPOSITION">Composition</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="GSTIN" name="gstin" fieldErrors={fieldErrors}>
          <Input
            id="gstin"
            name="gstin"
            defaultValue={defaultValues?.gstin ?? ""}
          />
        </Field>
      </section>
    </div>
  );
}
