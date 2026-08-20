export type {
  CatalogUnit,
  Product,
  ProductInput,
  ProductKind,
} from "@/modules/catalog/domain/types";
export { CATALOG_UNITS } from "@/modules/catalog/domain/types";
export {
  CatalogError,
  CatalogNotFoundError,
  CatalogSkuConflictError,
  CatalogValidationError,
} from "@/modules/catalog/domain/errors";
export { normalizeProductInput } from "@/modules/catalog/domain/normalize-product";
export {
  createProduct,
  updateProduct,
  getProduct,
  listProducts,
  listProductsPage,
} from "@/modules/catalog/application/products";
export {
  createMemoryCatalogRepository,
  type CatalogRepository,
} from "@/modules/catalog/infrastructure/repositories";
export {
  productInputSchema,
  productSearchSchema,
} from "@/modules/catalog/schemas/product.schema";
