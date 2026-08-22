import type { PinLookupResult } from "@/lib/geo/lookup-pincode";
import { lookupPincode } from "@/lib/geo/lookup-pincode";

type IndiaPostOffice = {
  Name?: string;
  District?: string;
  State?: string;
};

type IndiaPostResponse = {
  Status?: string;
  PostOffice?: IndiaPostOffice[] | null;
};

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

export function isPinLookupApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PIN_LOOKUP_API_ENABLED === "true";
}

export function mapIndiaPostResponse(
  pin: string,
  payload: IndiaPostResponse
): PinLookupResult {
  if (payload.Status !== "Success" || !payload.PostOffice?.length) {
    return { kind: "none" };
  }

  const states = uniqueStrings(
    payload.PostOffice.map((office) => office.State ?? "")
  );
  const districts = uniqueStrings(
    payload.PostOffice.map((office) => office.District ?? "")
  );

  if (states.length !== 1 || districts.length === 0) {
    return { kind: "none" };
  }

  const state = states[0]!;
  if (districts.length === 1) {
    return { kind: "unique", state, city: districts[0]! };
  }

  return { kind: "suggest", state, cityOptions: districts };
}

export async function lookupPincodeFromApi(pin: string): Promise<PinLookupResult> {
  const normalized = pin.trim();
  if (!/^\d{6}$/.test(normalized) || !isPinLookupApiEnabled()) {
    return { kind: "none" };
  }

  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${normalized}`,
      { method: "GET" }
    );
    if (!response.ok) {
      return { kind: "none" };
    }
    const payload = (await response.json()) as IndiaPostResponse[];
    return mapIndiaPostResponse(normalized, payload[0] ?? {});
  } catch {
    return { kind: "none" };
  }
}

export async function lookupPincodeWithFallback(pin: string): Promise<PinLookupResult> {
  const bundled = lookupPincode(pin);
  if (bundled.kind !== "none") {
    return bundled;
  }
  return lookupPincodeFromApi(pin);
}
