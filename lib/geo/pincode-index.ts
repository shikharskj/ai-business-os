import pincodeData from "@/lib/geo/data/pincodes.json";

export type PincodeRecord = {
  state: string;
  districts: string[];
  postOffices?: string[];
};

const PINCODE_INDEX: Readonly<Record<string, PincodeRecord>> = pincodeData;

export function getPincodeRecord(pin: string): PincodeRecord | null {
  const normalized = pin.trim();
  if (!/^\d{6}$/.test(normalized)) {
    return null;
  }
  return PINCODE_INDEX[normalized] ?? null;
}

export function hasBundledPincode(pin: string): boolean {
  return getPincodeRecord(pin) !== null;
}
