import type { ListKey } from "@/modules/list-order/domain/types";
import type { Permission } from "@/lib/security/permissions";

export const LIST_KEY_PERMISSIONS: Record<ListKey, Permission> = {
  invoices: "invoice:read",
  quotations: "quotation:read",
  customers: "customer:read",
  payments: "payment:read",
  suppliers: "supplier:read",
  products: "product:read",
  stock: "product:read",
  expenses: "expense:read",
  bills: "purchase:read",
};
