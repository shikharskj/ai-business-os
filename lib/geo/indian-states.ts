import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";

export type IndianStateOption = {
  code: string;
  name: string;
};

export const INDIAN_STATE_OPTIONS: IndianStateOption[] = Object.entries(
  GST_STATE_CODES
).map(([code, name]) => ({ code, name }));

export function getIndianStateOptions(): IndianStateOption[] {
  return INDIAN_STATE_OPTIONS;
}

export function isIndianStateName(state: string): boolean {
  const normalized = state.trim().toLowerCase();
  return INDIAN_STATE_OPTIONS.some(
    (option) => option.name.toLowerCase() === normalized
  );
}

export function stateNameFromCode(code: string): string | null {
  return GST_STATE_CODES[code] ?? null;
}
