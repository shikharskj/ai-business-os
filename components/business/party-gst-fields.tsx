"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import { stateNameFromCode } from "@/lib/geo/indian-states";
import { GST_STATE_CODES, gstinStateCode } from "@/modules/tax/domain/gstin";

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
  hint,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  fieldErrors?: Record<string, string>;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-base font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError name={name} fieldErrors={fieldErrors} />
    </div>
  );
}

export type PartyGstDefaults = {
  gstRegistrationStatus?: string | null;
  gstin?: string | null;
};

export type PartyGstStateBridge = {
  state: string;
  setState: (value: string) => void;
  stateTouched: boolean;
  setStateTouched: (touched: boolean) => void;
};

export function PartyGstFields({
  defaultValues,
  fieldErrors,
  readOnly = false,
  registrationLabel = "GST registration",
  compositionLabel = "Composition",
  stateBridge,
}: {
  defaultValues?: PartyGstDefaults;
  fieldErrors?: Record<string, string>;
  readOnly?: boolean;
  registrationLabel?: string;
  compositionLabel?: string;
  stateBridge?: PartyGstStateBridge;
}) {
  const [registrationStatus, setRegistrationStatus] = useState(
    defaultValues?.gstRegistrationStatus ?? "NOT_REGISTERED"
  );
  const [gstin, setGstin] = useState(defaultValues?.gstin ?? "");
  const [stateSuggestion, setStateSuggestion] = useState<string | null>(null);

  const showGstin = registrationStatus !== "NOT_REGISTERED";

  function handleGstinBlur() {
    const normalized = gstin.trim().toUpperCase();
    if (normalized !== gstin) {
      setGstin(normalized);
    }
    setStateSuggestion(null);
    if (normalized.length !== 15 || !stateBridge) {
      return;
    }
    try {
      const code = gstinStateCode(normalized);
      const stateName = stateNameFromCode(code) ?? GST_STATE_CODES[code];
      if (!stateName) {
        return;
      }
      if (stateBridge.stateTouched) {
        if (stateBridge.state !== stateName) {
          setStateSuggestion(stateName);
        }
        return;
      }
      if (!stateBridge.state || stateBridge.state === stateName) {
        stateBridge.setState(stateName);
        return;
      }
      setStateSuggestion(stateName);
    } catch {
      // Invalid GSTIN — no suggestion.
    }
  }

  function applyStateSuggestion() {
    if (!stateBridge || !stateSuggestion) {
      return;
    }
    stateBridge.setState(stateSuggestion);
    stateBridge.setStateTouched(false);
    setStateSuggestion(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <Field
        label={registrationLabel}
        name="gstRegistrationStatus"
        fieldErrors={fieldErrors}
      >
        {readOnly ? (
          <>
            <Input
              id="gstRegistrationStatus"
              value={
                registrationStatus === "REGISTERED"
                  ? "Registered"
                  : registrationStatus === "COMPOSITION"
                    ? compositionLabel
                    : "Not registered"
              }
              readOnly
              disabled
            />
            <input type="hidden" name="gstRegistrationStatus" value={registrationStatus} />
          </>
        ) : (
          <Select
            name="gstRegistrationStatus"
            value={registrationStatus}
            onValueChange={(value) => setRegistrationStatus(String(value ?? "NOT_REGISTERED"))}
            items={{
              NOT_REGISTERED: "Not registered",
              REGISTERED: "Registered",
              COMPOSITION: compositionLabel,
            }}
          >
            <SelectTrigger id="gstRegistrationStatus" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_REGISTERED">Not registered</SelectItem>
              <SelectItem value="REGISTERED">Registered</SelectItem>
              <SelectItem value="COMPOSITION">{compositionLabel}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </Field>

      {showGstin ? (
        <Field
          label="GSTIN"
          name="gstin"
          fieldErrors={fieldErrors}
          hint="15 characters when registered (state code + PAN + entity suffix)."
        >
          <Input
            id="gstin"
            name="gstin"
            value={gstin}
            onChange={(event) => setGstin(event.target.value)}
            onBlur={handleGstinBlur}
            placeholder={FORM_PLACEHOLDERS.gstin}
            maxLength={15}
            readOnly={readOnly}
            disabled={readOnly}
          />
          {stateSuggestion ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                GSTIN suggests state: {stateSuggestion}
              </span>
              {!readOnly ? (
                <button type="button" className="inline-flex" onClick={applyStateSuggestion}>
                  <Badge variant="secondary">Apply suggestion</Badge>
                </button>
              ) : null}
            </div>
          ) : null}
        </Field>
      ) : (
        <input type="hidden" name="gstin" value="" />
      )}
    </div>
  );
}
