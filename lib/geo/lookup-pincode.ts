import { getPincodeRecord } from "@/lib/geo/pincode-index";

export type PinLookupResult =
  | { kind: "none" }
  | { kind: "suggest"; state: string; cityOptions: string[] }
  | { kind: "unique"; state: string; city: string };

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function lookupPincode(input: string): PinLookupResult {
  const pin = input.trim();
  if (!/^\d{6}$/.test(pin)) {
    return { kind: "none" };
  }

  const record = getPincodeRecord(pin);
  if (!record) {
    return { kind: "none" };
  }

  const cityOptions = uniqueStrings(record.districts);
  if (cityOptions.length === 0) {
    return { kind: "none" };
  }

  if (cityOptions.length === 1) {
    return {
      kind: "unique",
      state: record.state,
      city: cityOptions[0]!,
    };
  }

  return {
    kind: "suggest",
    state: record.state,
    cityOptions,
  };
}
