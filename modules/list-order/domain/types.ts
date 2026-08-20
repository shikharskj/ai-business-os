export const LIST_KEYS = [
  "invoices",
  "quotations",
  "customers",
  "payments",
  "supplier-payments",
  "suppliers",
  "products",
  "stock",
  "expenses",
  "bills",
] as const;

export type ListKey = (typeof LIST_KEYS)[number];

export function isListKey(value: string): value is ListKey {
  return (LIST_KEYS as readonly string[]).includes(value);
}
