"use client";

import { useState } from "react";

import { IndianAddressFields } from "@/components/business/indian-address-fields";
import { PartyGstFields } from "@/components/business/party-gst-fields";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import type { BusinessProfile } from "@/modules/tenant/domain/types";

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

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "India (IST, UTC+5:30)" },
  { value: "America/New_York", label: "US Eastern (ET)" },
  { value: "America/Chicago", label: "US Central (CT)" },
  { value: "America/Los_Angeles", label: "US Pacific (PT)" },
  { value: "Europe/London", label: "UK (GMT/BST)" },
  { value: "Asia/Dubai", label: "Dubai (GST, UTC+4)" },
  { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8)" },
] as const;

const CURRENCIES = [
  { value: "INR", label: "INR – Indian Rupee" },
  { value: "USD", label: "USD – US Dollar" },
  { value: "EUR", label: "EUR – Euro" },
  { value: "GBP", label: "GBP – British Pound" },
  { value: "AED", label: "AED – UAE Dirham" },
  { value: "SGD", label: "SGD – Singapore Dollar" },
] as const;

export function BusinessProfileFields({
  defaultValues,
  fieldErrors,
  readOnly = false,
}: {
  defaultValues?: Partial<BusinessProfile>;
  fieldErrors?: Record<string, string>;
  readOnly?: boolean;
}) {
  const [state, setState] = useState(defaultValues?.state ?? "");
  const [stateTouched, setStateTouched] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Business details</h2>
        <Field label="Business name" name="name" fieldErrors={fieldErrors}>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            placeholder={FORM_PLACEHOLDERS.businessName}
            required={!readOnly}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </Field>
        <Field label="Business type" name="type" fieldErrors={fieldErrors}>
          <Select
            name="type"
            defaultValue={defaultValues?.type ?? "PROPRIETORSHIP"}
            disabled={readOnly}
            items={{
              PROPRIETORSHIP: "Proprietorship",
              PARTNERSHIP: "Partnership",
              PRIVATE_LIMITED: "Private limited",
              LLP: "LLP",
              OTHER: "Other",
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PROPRIETORSHIP">Proprietorship</SelectItem>
              <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
              <SelectItem value="PRIVATE_LIMITED">Private limited</SelectItem>
              <SelectItem value="LLP">LLP</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Contact</h2>
        <Field label="Phone" name="phone" fieldErrors={fieldErrors}>
          <Input
            id="phone"
            name="phone"
            inputMode="tel"
            defaultValue={defaultValues?.phone}
            placeholder={FORM_PLACEHOLDERS.phone}
            required={!readOnly}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </Field>
        <Field label="Email" name="email" fieldErrors={fieldErrors}>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email}
            placeholder={FORM_PLACEHOLDERS.email}
            required={!readOnly}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Address</h2>
        <IndianAddressFields
          names={{
            line1: "addressLine1",
            line2: "addressLine2",
            city: "city",
            state: "state",
            postalCode: "postalCode",
            country: "country",
          }}
          defaultValues={{
            line1: defaultValues?.addressLine1,
            line2: defaultValues?.addressLine2,
            city: defaultValues?.city,
            state: defaultValues?.state,
            postalCode: defaultValues?.postalCode,
            country: defaultValues?.country ?? "IN",
          }}
          fieldErrors={fieldErrors}
          readOnly={readOnly}
          required={!readOnly}
          countryMode="select"
          stateBridge={{ state, setState, stateTouched, setStateTouched }}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Tax and finance</h2>
        <PartyGstFields
          defaultValues={{
            gstRegistrationStatus: defaultValues?.gstRegistrationStatus,
            gstin: defaultValues?.gstin,
          }}
          fieldErrors={fieldErrors}
          readOnly={readOnly}
          registrationLabel="GST registration status"
          compositionLabel="Composition scheme"
          stateBridge={{ state, setState, stateTouched, setStateTouched }}
        />
        <Field
          label="Default GST rate"
          name="defaultGstRateBps"
          fieldErrors={fieldErrors}
        >
          <Select
            name="defaultGstRateBps"
            defaultValue={String(defaultValues?.defaultGstRateBps ?? 1800)}
            disabled={readOnly}
            items={{
              "0": "0%",
              "500": "5%",
              "1200": "12%",
              "1800": "18%",
              "2800": "28%",
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select GST rate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="500">5%</SelectItem>
              <SelectItem value="1200">12%</SelectItem>
              <SelectItem value="1800">18%</SelectItem>
              <SelectItem value="2800">28%</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Low-stock alert quantity"
          name="lowStockThreshold"
          fieldErrors={fieldErrors}
        >
          <Input
            id="lowStockThreshold"
            name="lowStockThreshold"
            inputMode="decimal"
            defaultValue={defaultValues?.lowStockThreshold ?? "5"}
            placeholder="5"
            readOnly={readOnly}
            disabled={readOnly}
          />
          <p className="text-xs text-muted-foreground">
            Inventory-tracked products at or below this quantity are marked
            low stock.
          </p>
        </Field>
        <Field
          label="Financial year starts in"
          name="financialYearStartMonth"
          fieldErrors={fieldErrors}
        >
          <Select
            name="financialYearStartMonth"
            defaultValue={String(defaultValues?.financialYearStartMonth ?? 4)}
            disabled={readOnly}
            items={MONTHS.map((m) => ({ value: m.value, label: m.label }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Changing this affects future reports; existing posted records are
            unchanged.
          </p>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Timezone" name="timezone" fieldErrors={fieldErrors}>
            <Select
              name="timezone"
              defaultValue={defaultValues?.timezone ?? "Asia/Kolkata"}
              disabled={readOnly}
              items={TIMEZONES.map((tz) => ({ value: tz.value, label: tz.label }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Changing this affects future reports; existing posted records are
              unchanged.
            </p>
          </Field>
          <Field label="Currency" name="currency" fieldErrors={fieldErrors}>
            <Select
              name="currency"
              defaultValue={defaultValues?.currency ?? "INR"}
              disabled={readOnly}
              items={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Changing this affects future reports; existing posted records are
              unchanged.
            </p>
          </Field>
        </div>
      </section>
    </div>
  );
}
