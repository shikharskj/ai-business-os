import type { Product, ProductInput, ProductKind } from "@/modules/catalog/domain/types";

export type ProductListFilter = {
  tenantId: string;
  query?: string;
  kind?: ProductKind | "ALL";
};

export type CatalogRepository = {
  createProduct(input: {
    tenantId: string;
    fields: ProductInput;
  }): Promise<Product>;
  updateProduct(input: {
    tenantId: string;
    productId: string;
    fields: ProductInput;
  }): Promise<Product | null>;
  findProductById(tenantId: string, productId: string): Promise<Product | null>;
  findProductBySku(tenantId: string, sku: string): Promise<Product | null>;
  listProducts(filter: ProductListFilter): Promise<Product[]>;
};

export function createMemoryCatalogRepository(
  initial: Product[] = []
): CatalogRepository & { records: Product[] } {
  const records = [...initial];

  return {
    records,
    async createProduct(input) {
      const now = new Date();
      const product: Product = {
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
        kind: input.fields.kind,
        name: input.fields.name,
        sku: input.fields.sku,
        unitOfMeasurement: input.fields.unitOfMeasurement,
        sellingPrice: input.fields.sellingPrice,
        purchasePrice: input.fields.purchasePrice,
        hsnSac: input.fields.hsnSac ?? null,
        taxRateBps: input.fields.taxRateBps,
        category: input.fields.category ?? null,
        tracksInventory: input.fields.tracksInventory,
        createdAt: now,
        updatedAt: now,
      };
      records.push(product);
      return product;
    },
    async updateProduct(input) {
      const index = records.findIndex(
        (record) =>
          record.tenantId === input.tenantId && record.id === input.productId
      );
      if (index === -1) {
        return null;
      }
      const updated: Product = {
        ...records[index]!,
        kind: input.fields.kind,
        name: input.fields.name,
        sku: input.fields.sku,
        unitOfMeasurement: input.fields.unitOfMeasurement,
        sellingPrice: input.fields.sellingPrice,
        purchasePrice: input.fields.purchasePrice,
        hsnSac: input.fields.hsnSac ?? null,
        taxRateBps: input.fields.taxRateBps,
        category: input.fields.category ?? null,
        tracksInventory: input.fields.tracksInventory,
        updatedAt: new Date(),
      };
      records[index] = updated;
      return updated;
    },
    async findProductById(tenantId, productId) {
      return (
        records.find(
          (record) => record.tenantId === tenantId && record.id === productId
        ) ?? null
      );
    },
    async findProductBySku(tenantId, sku) {
      return (
        records.find(
          (record) => record.tenantId === tenantId && record.sku === sku
        ) ?? null
      );
    },
    async listProducts(filter) {
      const query = filter.query?.trim().toLowerCase() ?? "";
      return records
        .filter((record) => record.tenantId === filter.tenantId)
        .filter((record) => {
          if (!filter.kind || filter.kind === "ALL") {
            return true;
          }
          return record.kind === filter.kind;
        })
        .filter((record) => {
          if (!query) {
            return true;
          }
          return [record.name, record.sku, record.hsnSac, record.category]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query));
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}
