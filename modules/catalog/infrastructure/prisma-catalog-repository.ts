import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { Product } from "@/modules/catalog/domain/types";
import type { CatalogRepository } from "@/modules/catalog/infrastructure/repositories";
import {
  moneyFromPrismaDecimal,
  toDecimalForPrisma,
} from "@/modules/shared-kernel/money";

function mapProduct(record: {
  id: string;
  tenantId: string;
  kind: string;
  name: string;
  sku: string;
  unitOfMeasurement: string;
  sellingPrice: { toString(): string };
  purchasePrice: { toString(): string };
  hsnSac: string | null;
  taxRateBps: number;
  category: string | null;
  tracksInventory: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Product {
  if (record.kind !== "PRODUCT" && record.kind !== "SERVICE") {
    throw new Error("Unknown product kind.");
  }

  return {
    id: record.id,
    tenantId: record.tenantId,
    kind: record.kind,
    name: record.name,
    sku: record.sku,
    unitOfMeasurement: record.unitOfMeasurement,
    sellingPrice: moneyFromPrismaDecimal(record.sellingPrice),
    purchasePrice: moneyFromPrismaDecimal(record.purchasePrice),
    hsnSac: record.hsnSac,
    taxRateBps: record.taxRateBps,
    category: record.category,
    tracksInventory: record.tracksInventory,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function createPrismaCatalogRepository(
  client: Pick<PrismaClient, "product">
): CatalogRepository {
  return {
    async createProduct(input) {
      const record = await client.product.create({
        data: {
          tenantId: input.tenantId,
          kind: input.fields.kind,
          name: input.fields.name,
          sku: input.fields.sku,
          unitOfMeasurement: input.fields.unitOfMeasurement,
          sellingPrice: toDecimalForPrisma(input.fields.sellingPrice),
          purchasePrice: toDecimalForPrisma(input.fields.purchasePrice),
          hsnSac: input.fields.hsnSac ?? null,
          taxRateBps: input.fields.taxRateBps,
          category: input.fields.category ?? null,
          tracksInventory: input.fields.tracksInventory,
        },
      });
      return mapProduct(record);
    },

    async updateProduct(input) {
      const existing = await client.product.findFirst({
        where: { id: input.productId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }

      const record = await client.product.update({
        where: { id: existing.id },
        data: {
          kind: input.fields.kind,
          name: input.fields.name,
          sku: input.fields.sku,
          unitOfMeasurement: input.fields.unitOfMeasurement,
          sellingPrice: toDecimalForPrisma(input.fields.sellingPrice),
          purchasePrice: toDecimalForPrisma(input.fields.purchasePrice),
          hsnSac: input.fields.hsnSac ?? null,
          taxRateBps: input.fields.taxRateBps,
          category: input.fields.category ?? null,
          tracksInventory: input.fields.tracksInventory,
        },
      });
      return mapProduct(record);
    },

    async findProductById(tenantId, productId) {
      const record = await client.product.findFirst({
        where: { id: productId, tenantId },
      });
      return record ? mapProduct(record) : null;
    },

    async findProductBySku(tenantId, sku) {
      const record = await client.product.findFirst({
        where: { tenantId, sku },
      });
      return record ? mapProduct(record) : null;
    },

    async listProducts(filter) {
      const query = filter.query?.trim();
      const kindFilter =
        !filter.kind || filter.kind === "ALL" ? undefined : filter.kind;

      const where: Prisma.ProductWhereInput = {
        tenantId: filter.tenantId,
        kind: kindFilter,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { sku: { contains: query, mode: "insensitive" } },
                { hsnSac: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const records = await client.product.findMany({
        where,
        orderBy: { name: "asc" },
      });
      return records.map(mapProduct);
    },
  };
}

export const prismaCatalogRepository = createPrismaCatalogRepository(prisma);
