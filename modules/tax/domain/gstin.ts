import { InvalidGstinError, InvalidPlaceOfSupplyError } from "@/modules/tax/domain/errors";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/**
 * GST state codes used as place of supply / GSTIN prefix.
 * Source: GSTN state code list.
 */
export const GST_STATE_CODES: Readonly<Record<string, string>> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

const STATE_NAME_TO_CODE = new Map(
  Object.entries(GST_STATE_CODES).map(([code, name]) => [name.toLowerCase(), code])
);

export function isGstStateCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(GST_STATE_CODES, code);
}

export function requireGstStateCode(code: string): string {
  if (!isGstStateCode(code)) {
    throw new InvalidPlaceOfSupplyError(code);
  }
  return code;
}

export function gstinStateCode(gstin: string): string {
  const normalized = gstin.trim().toUpperCase();
  if (!GSTIN_PATTERN.test(normalized)) {
    throw new InvalidGstinError(gstin);
  }
  const code = normalized.slice(0, 2);
  return requireGstStateCode(code);
}

export function stateCodeFromName(stateName: string): string | null {
  return STATE_NAME_TO_CODE.get(stateName.trim().toLowerCase()) ?? null;
}

export function normalizeGstin(gstin: string | null | undefined): string | null {
  if (!gstin) {
    return null;
  }
  const normalized = gstin.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (!GSTIN_PATTERN.test(normalized)) {
    throw new InvalidGstinError(gstin);
  }
  return normalized;
}
