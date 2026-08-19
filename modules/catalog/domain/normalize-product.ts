import { COMMON_GST_RATE_BPS } from "@/modules/tax/domain/types";
import { CatalogValidationError } from "@/modules/catalog/domain/errors";
import {
  CATALOG_UNITS,
  type ProductInput,
} from "@/modules/catalog/domain/types";
import { isNegative } from "@/modules/shared-kernel/money";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeProductInput(input: ProductInput): ProductInput {
  const name = input.name.trim();
  if (name.length < 2) {
    throw new CatalogValidationError("Product name is required.");
  }

  const sku = input.sku.trim().toUpperCase();
  if (sku.length < 1) {
    throw new CatalogValidationError("SKU / item code is required.");
  }

  const unit = input.unitOfMeasurement.trim().toUpperCase();
  if (!CATALOG_UNITS.includes(unit as (typeof CATALOG_UNITS)[number])) {
    throw new CatalogValidationError("Select a valid unit of measurement.");
  }

  if (isNegative(input.sellingPrice) || isNegative(input.purchasePrice)) {
    throw new CatalogValidationError("Prices cannot be negative.");
  }

  if (
    !COMMON_GST_RATE_BPS.includes(
      input.taxRateBps as (typeof COMMON_GST_RATE_BPS)[number]
    )
  ) {
    throw new CatalogValidationError("Select a valid GST rate.");
  }

  const hsnSac = emptyToNull(input.hsnSac)?.toUpperCase() ?? null;
  if (hsnSac && !/^[0-9]{4,8}$/.test(hsnSac)) {
    throw new CatalogValidationError("HSN/SAC must be 4 to 8 digits.");
  }

  const tracksInventory =
    input.kind === "SERVICE" ? false : Boolean(input.tracksInventory);

  return {
    kind: input.kind,
    name,
    sku,
    unitOfMeasurement: unit,
    sellingPrice: input.sellingPrice,
    purchasePrice: input.purchasePrice,
    hsnSac,
    taxRateBps: input.taxRateBps,
    category: emptyToNull(input.category),
    tracksInventory,
  };
}
