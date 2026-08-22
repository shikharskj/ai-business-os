"use client";

import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { FormCombobox } from "@/components/ui/form-combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORM_PLACEHOLDERS } from "@/lib/forms/placeholders";
import {
  cityBelongsToState,
  getCitiesForState,
  getIndianStateOptions,
  getStateForCity,
  lookupPincodeWithFallback,
} from "@/lib/geo";

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
  required,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  fieldErrors?: Record<string, string>;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-base font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      <FieldError name={name} fieldErrors={fieldErrors} />
    </div>
  );
}

export type IndianAddressFieldNames = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export type IndianAddressDefaults = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type IndianAddressStateBridge = {
  state: string;
  setState: (value: string) => void;
  stateTouched: boolean;
  setStateTouched: (touched: boolean) => void;
};

type PinSuggestion =
  | { kind: "unique"; state: string; city: string }
  | { kind: "suggest"; state: string; cityOptions: string[] };

const COUNTRY_OPTIONS = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
] as const;

export function IndianAddressFields({
  names,
  defaultValues,
  fieldErrors,
  readOnly = false,
  required = false,
  countryMode = "hidden-in",
  stateBridge,
}: {
  names: IndianAddressFieldNames;
  defaultValues?: IndianAddressDefaults;
  fieldErrors?: Record<string, string>;
  readOnly?: boolean;
  required?: boolean;
  countryMode?: "hidden-in" | "select";
  stateBridge?: IndianAddressStateBridge;
}) {
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [internalState, setInternalState] = useState(defaultValues?.state ?? "");
  const [postalCode, setPostalCode] = useState(defaultValues?.postalCode ?? "");
  const [country, setCountry] = useState(defaultValues?.country ?? "IN");
  const [cityTouched, setCityTouched] = useState(false);
  const [internalStateTouched, setInternalStateTouched] = useState(false);
  const [cityStateWarning, setCityStateWarning] = useState<string | null>(null);
  const [pinSuggestion, setPinSuggestion] = useState<PinSuggestion | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  const state = stateBridge?.state ?? internalState;
  const setState = stateBridge?.setState ?? setInternalState;
  const stateTouched = stateBridge?.stateTouched ?? internalStateTouched;
  const setStateTouched =
    stateBridge?.setStateTouched ?? setInternalStateTouched;

  const stateOptions = useMemo(
    () =>
      getIndianStateOptions().map((option) => ({
        value: option.name,
        label: option.name,
        keywords: option.code,
      })),
    []
  );

  const cityOptions = useMemo(() => {
    const curated = getCitiesForState(state);
    const values = new Set(curated.map((value) => value.toLowerCase()));
    if (city.trim() && !values.has(city.trim().toLowerCase())) {
      return [{ value: city, label: city }, ...curated.map((value) => ({ value, label: value }))];
    }
    return curated.map((value) => ({ value, label: value }));
  }, [city, state]);

  const applyPinSuggestion = useCallback(
    (suggestion: PinSuggestion, selectedCity?: string) => {
      if (cityTouched && stateTouched) {
        return;
      }
      const nextCity =
        suggestion.kind === "unique"
          ? suggestion.city
          : (selectedCity ?? suggestion.cityOptions[0] ?? "");
      if (!cityTouched && nextCity) {
        setCity(nextCity);
      }
      if (!stateTouched && suggestion.state) {
        setState(suggestion.state);
      }
      setPinSuggestion(null);
      setCityStateWarning(null);
    },
    [cityTouched, setState, stateTouched]
  );

  function handlePostalCodeBlur() {
    const pin = postalCode.trim();
    if (pin.length !== 6 || (cityTouched && stateTouched)) {
      setPinSuggestion(null);
      return;
    }
    void lookupPincodeWithFallback(pin).then((result) => {
      if (result.kind === "none") {
        setPinSuggestion(null);
        return;
      }
      if (result.kind === "unique") {
        setPinSuggestion(result);
        return;
      }
      setPinSuggestion(result);
      setCityPickerOpen(true);
    });
  }

  function handleCityChange(nextCity: string) {
    setCity(nextCity);
    setCityTouched(true);
    setPinSuggestion(null);
    setCityStateWarning(null);

    const mappedState = getStateForCity(nextCity);
    if (!mappedState) {
      return;
    }
    if (!state || cityBelongsToState(nextCity, state)) {
      if (!stateTouched) {
        setState(mappedState);
      }
      return;
    }
    setCityStateWarning(
      `${nextCity} is typically in ${mappedState}, but ${state} is selected.`
    );
  }

  function handleStateChange(nextState: string) {
    setState(nextState);
    setStateTouched(true);
    setPinSuggestion(null);
    setCityStateWarning(null);
    if (city.trim() && !cityBelongsToState(city, nextState)) {
      setCity("");
      setCityTouched(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Address line 1"
        name={names.line1}
        fieldErrors={fieldErrors}
        required={required}
      >
        <Input
          id={names.line1}
          name={names.line1}
          defaultValue={defaultValues?.line1 ?? ""}
          placeholder={FORM_PLACEHOLDERS.addressLine1}
          required={required && !readOnly}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </Field>

      <Field label="Address line 2" name={names.line2} fieldErrors={fieldErrors}>
        <Input
          id={names.line2}
          name={names.line2}
          defaultValue={defaultValues?.line2 ?? ""}
          placeholder={FORM_PLACEHOLDERS.addressLine2}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </Field>

      <Field label="PIN code" name={names.postalCode} fieldErrors={fieldErrors} required={required}>
        {readOnly ? (
          <Input
            id={names.postalCode}
            name={names.postalCode}
            value={postalCode}
            readOnly
            disabled
          />
        ) : (
          <Input
            id={names.postalCode}
            name={names.postalCode}
            inputMode="numeric"
            maxLength={6}
            placeholder={FORM_PLACEHOLDERS.pinCode}
            value={postalCode}
            onChange={(event) => {
              setPostalCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setPinSuggestion(null);
            }}
            onBlur={handlePostalCodeBlur}
            required={required}
          />
        )}
        {pinSuggestion?.kind === "unique" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              PIN {postalCode} → {pinSuggestion.city}, {pinSuggestion.state}
            </span>
            <button
              type="button"
              className="inline-flex"
              onClick={() => applyPinSuggestion(pinSuggestion)}
            >
              <Badge variant="secondary">Apply suggestion</Badge>
            </button>
          </div>
        ) : null}
        {pinSuggestion?.kind === "suggest" ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              PIN {postalCode} matches multiple areas in {pinSuggestion.state}. Pick a city:
            </p>
            <div className="flex flex-wrap gap-2">
              {pinSuggestion.cityOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => applyPinSuggestion(pinSuggestion, option)}
                >
                  <Badge variant="outline">{option}</Badge>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" name={names.city} fieldErrors={fieldErrors} required={required}>
          {readOnly ? (
            <Input id={names.city} name={names.city} value={city} readOnly disabled />
          ) : (
            <FormCombobox
              id={names.city}
              name={names.city}
              value={city}
              onValueChange={handleCityChange}
              options={cityOptions}
              placeholder={FORM_PLACEHOLDERS.city}
              searchPlaceholder="Search cities…"
              allowCustom
              className={cityPickerOpen ? "ring-2 ring-ring" : undefined}
            />
          )}
        </Field>

        <Field label="State" name={names.state} fieldErrors={fieldErrors} required={required}>
          {readOnly ? (
            <Input id={names.state} name={names.state} value={state} readOnly disabled />
          ) : (
            <FormCombobox
              id={names.state}
              name={names.state}
              value={state}
              onValueChange={handleStateChange}
              options={stateOptions}
              placeholder={FORM_PLACEHOLDERS.state}
              searchPlaceholder="Search states…"
              allowCustom={false}
            />
          )}
        </Field>
      </div>

      {cityStateWarning ? (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
          {cityStateWarning}
        </p>
      ) : null}

      {countryMode === "hidden-in" ? (
        <input type="hidden" name={names.country ?? "country"} value="IN" />
      ) : (
        <Field
          label="Country"
          name={names.country ?? "country"}
          fieldErrors={fieldErrors}
          required={required}
        >
          {readOnly ? (
            <Input
              id={names.country ?? "country"}
              name={names.country ?? "country"}
              value={country}
              readOnly
              disabled
            />
          ) : (
            <>
              <Select
                value={country}
                onValueChange={(value) => setCountry(String(value ?? "IN"))}
                items={Object.fromEntries(COUNTRY_OPTIONS.map((row) => [row.value, row.label]))}
              >
                <SelectTrigger id={names.country ?? "country"} className="w-full">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((row) => (
                    <SelectItem key={row.value} value={row.value}>
                      {row.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name={names.country ?? "country"} value={country} />
            </>
          )}
        </Field>
      )}
    </div>
  );
}
