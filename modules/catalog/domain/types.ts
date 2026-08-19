import type { Money } from "@/modules/shared-kernel/money";

export type ProductKind = "PRODUCT" | "SERVICE";

export type Product = {
  id: string;
  tenantId: string;
  kind: ProductKind;
  name: string;
  sku: string;
  unitOfMeasurement: string;
  sellingPrice: Money;
  purchasePrice: Money;
  hsnSac: string | null;
  taxRateBps: number;
  category: string | null;
  tracksInventory: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductInput = {
  kind: ProductKind;
  name: string;
  sku: string;
  unitOfMeasurement: string;
  sellingPrice: Money;
  purchasePrice: Money;
  hsnSac?: string | null;
  taxRateBps: number;
  category?: string | null;
  tracksInventory: boolean;
};

export const CATALOG_UNITS = [
  "PCS",
  "NOS",
  "KG",
  "GMS",
  "LTR",
  "MTR",
  "BOX",
  "PKT",
  "DOZ",
  "SET",
  "HR",
  "SQFT",
  "TON",
] as const;

export type CatalogUnit = (typeof CATALOG_UNITS)[number];
