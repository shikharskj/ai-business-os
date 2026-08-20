export const LIST_KEYS = [
  "invoices",
  "quotations",
  "customers",
  "payments",
  "suppliers",
  "products",
  "stock",
  "expenses",
] as const;

export type ListKey = (typeof LIST_KEYS)[number];

export function isListKey(value: string): value is ListKey {
  return (LIST_KEYS as readonly string[]).includes(value);
}
