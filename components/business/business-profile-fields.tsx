"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

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
}: {
  defaultValues?: Partial<BusinessProfile>;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Business details</h2>
        <Field label="Business name" name="name" fieldErrors={fieldErrors}>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            required
          />
        </Field>
        <Field label="Business type" name="type" fieldErrors={fieldErrors}>
          <Select
            name="type"
            defaultValue={defaultValues?.type ?? "PROPRIETORSHIP"}
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
            defaultValue={defaultValues?.phone}
            required
          />
        </Field>
        <Field label="Email" name="email" fieldErrors={fieldErrors}>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email}
            required
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Address</h2>
        <Field label="Address line 1" name="addressLine1" fieldErrors={fieldErrors}>
          <Input
            id="addressLine1"
            name="addressLine1"
            defaultValue={defaultValues?.addressLine1}
            required
          />
        </Field>
        <Field label="Address line 2" name="addressLine2" fieldErrors={fieldErrors}>
          <Input
            id="addressLine2"
            name="addressLine2"
            defaultValue={defaultValues?.addressLine2 ?? undefined}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="City" name="city" fieldErrors={fieldErrors}>
            <Input id="city" name="city" defaultValue={defaultValues?.city} required />
          </Field>
          <Field label="State" name="state" fieldErrors={fieldErrors}>
            <Select name="state" defaultValue={defaultValues?.state ?? ""}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Postal code" name="postalCode" fieldErrors={fieldErrors}>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={defaultValues?.postalCode}
              required
            />
          </Field>
          <Field label="Country" name="country" fieldErrors={fieldErrors}>
            <Select
              name="country"
              defaultValue={defaultValues?.country ?? "IN"}
              items={{
                IN: "India",
                US: "United States",
                GB: "United Kingdom",
                AE: "United Arab Emirates",
                SG: "Singapore",
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">India</SelectItem>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="AE">United Arab Emirates</SelectItem>
                <SelectItem value="SG">Singapore</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-medium">Tax and finance</h2>
        <Field
          label="GST registration status"
          name="gstRegistrationStatus"
          fieldErrors={fieldErrors}
        >
          <Select
            name="gstRegistrationStatus"
            defaultValue={defaultValues?.gstRegistrationStatus ?? "NOT_REGISTERED"}
            items={{
              NOT_REGISTERED: "Not registered",
              REGISTERED: "Registered",
              COMPOSITION: "Composition scheme",
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="GST registration status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_REGISTERED">Not registered</SelectItem>
              <SelectItem value="REGISTERED">Registered</SelectItem>
              <SelectItem value="COMPOSITION">Composition scheme</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="GSTIN" name="gstin" fieldErrors={fieldErrors}>
          <Input
            id="gstin"
            name="gstin"
            defaultValue={defaultValues?.gstin ?? undefined}
            placeholder="15-character GSTIN"
          />
        </Field>
        <Field
          label="Default GST rate"
          name="defaultGstRateBps"
          fieldErrors={fieldErrors}
        >
          <Select
            name="defaultGstRateBps"
            defaultValue={String(defaultValues?.defaultGstRateBps ?? 1800)}
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
          label="Financial year starts in"
          name="financialYearStartMonth"
          fieldErrors={fieldErrors}
        >
          <Select
            name="financialYearStartMonth"
            defaultValue={String(defaultValues?.financialYearStartMonth ?? 4)}
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
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Timezone" name="timezone" fieldErrors={fieldErrors}>
            <Select
              name="timezone"
              defaultValue={defaultValues?.timezone ?? "Asia/Kolkata"}
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
          </Field>
          <Field label="Currency" name="currency" fieldErrors={fieldErrors}>
            <Select
              name="currency"
              defaultValue={defaultValues?.currency ?? "INR"}
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
          </Field>
        </div>
      </section>
    </div>
  );
}
