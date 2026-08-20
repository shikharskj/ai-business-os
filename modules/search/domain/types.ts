import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { Permission } from "@/lib/security/permissions";

export const SEARCH_ENTITY_TYPES = [
  "customer",
  "supplier",
  "product",
  "invoice",
  "purchase",
  "payment",
  "supplier_payment",
  "expense",
] as const;

export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];

export const SEARCH_ENTITY_PERMISSION: Record<SearchEntityType, Permission> = {
  customer: "customer:read",
  supplier: "supplier:read",
  product: "product:read",
  invoice: "invoice:read",
  purchase: "purchase:read",
  payment: "payment:read",
  supplier_payment: "payment:read",
  expense: "expense:read",
};

export const SEARCH_ENTITY_LABEL: Record<SearchEntityType, string> = {
  customer: "Customer",
  supplier: "Supplier",
  product: "Product",
  invoice: "Invoice",
  purchase: "Purchase",
  payment: "Payment",
  supplier_payment: "Supplier payment",
  expense: "Expense",
};

export type SearchResult = {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string | null;
  href: string;
  status: string | null;
  amountLabel: string | null;
  partyName: string | null;
  businessDate: BusinessDate | null;
  rank: number;
};

export type SearchFilter = {
  tenantId: string;
  query: string;
  types?: readonly SearchEntityType[];
  status?: string;
  fromDate?: BusinessDate;
  toDate?: BusinessDate;
  limit?: number;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
  total: number;
};
