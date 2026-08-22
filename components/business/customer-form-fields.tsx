"use client";

import { useState } from "react";

import { IndianAddressFields } from "@/components/business/indian-address-fields";
import { PartyGstFields } from "@/components/business/party-gst-fields";
import { Input } from "@/components/ui/input";
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import type { Party } from "@/modules/party/domain/types";

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
      <label htmlFor={name} className="text-base font-medium">
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
  heading = "Customer details",
}: {
  defaultValues?: Partial<Party>;
  fieldErrors?: Record<string, string>;
  heading?: string;
}) {
  const [state, setState] = useState(defaultValues?.state ?? "");
  const [stateTouched, setStateTouched] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">{heading}</h2>
        <Field label="Business name" name="name" fieldErrors={fieldErrors}>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaultValues?.name ?? ""}
            placeholder={FORM_PLACEHOLDERS.businessName}
          />
        </Field>
        <Field label="Phone" name="phone" fieldErrors={fieldErrors}>
          <Input
            id="phone"
            name="phone"
            inputMode="tel"
            defaultValue={defaultValues?.phone ?? ""}
            placeholder={FORM_PLACEHOLDERS.phone}
          />
        </Field>
        <Field label="Email" name="email" fieldErrors={fieldErrors}>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            placeholder={FORM_PLACEHOLDERS.email}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Billing address</h2>
        <IndianAddressFields
          names={{
            line1: "billingAddressLine1",
            line2: "billingAddressLine2",
            city: "city",
            state: "state",
            postalCode: "postalCode",
            country: "country",
          }}
          defaultValues={{
            line1: defaultValues?.billingAddressLine1,
            line2: defaultValues?.billingAddressLine2,
            city: defaultValues?.city,
            state: defaultValues?.state,
            postalCode: defaultValues?.postalCode,
            country: defaultValues?.country ?? "IN",
          }}
          fieldErrors={fieldErrors}
          stateBridge={{ state, setState, stateTouched, setStateTouched }}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">GST</h2>
        <PartyGstFields
          defaultValues={{
            gstRegistrationStatus: defaultValues?.gstRegistrationStatus,
            gstin: defaultValues?.gstin,
          }}
          fieldErrors={fieldErrors}
          stateBridge={{ state, setState, stateTouched, setStateTouched }}
        />
      </section>
    </div>
  );
}
