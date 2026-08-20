import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fetchOrderedPage } from "@/modules/list-order/infrastructure/ordered-page";
import { businessDate } from "@/modules/shared-kernel/dates";
import {
  moneyFromPrismaDecimal,
  toDecimalForPrisma,
} from "@/modules/shared-kernel/money";
import {
  quantityFromPrismaDecimal,
  toQuantityDecimalForPrisma,
} from "@/modules/inventory/domain/quantity";
import type { GstSupplyType, GstTreatment } from "@/modules/tax/domain/types";
import type {
  PreparedPurchase,
  Purchase,
  PurchaseLine,
  PurchaseListFilter,
  PurchaseStatus,
} from "@/modules/purchases/domain/types";
import type { PurchasesRepository } from "@/modules/purchases/infrastructure/repositories";

type PrismaPurchasesClient = Pick<
  PrismaClient,
  "purchase" | "purchaseLine" | "purchaseNumberSeries" | "$queryRaw"
>;

const PURCHASE_STATUSES = new Set<PurchaseStatus>([
  "DRAFT",
  "POSTED",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
]);

function mapPurchaseStatus(value: string): PurchaseStatus {
  if (!PURCHASE_STATUSES.has(value as PurchaseStatus)) {
    throw new Error("Unknown purchase status.");
  }
  return value as PurchaseStatus;
}

function mapSupplyType(value: string): GstSupplyType | "MIXED" {
  if (
    value === "INTRA_STATE" ||
    value === "INTER_STATE" ||
    value === "NONE" ||
    value === "MIXED"
  ) {
    return value;
  }
  throw new Error("Unknown GST supply type.");
}

function mapLineSupplyType(value: string): GstSupplyType {
  if (value === "INTRA_STATE" || value === "INTER_STATE" || value === "NONE") {
    return value;
  }
  throw new Error("Unknown GST supply type.");
}

function mapTreatment(value: string): GstTreatment {
  if (
    value === "STANDARD" ||
    value === "NOT_REGISTERED" ||
    value === "COMPOSITION" ||
    value === "UNREGISTERED_COUNTERPARTY" ||
    value === "EXEMPT"
  ) {
    return value;
  }
  throw new Error("Unknown GST treatment.");
}

function lineCreateData(prepared: PreparedPurchase) {
  return prepared.lines.map((line) => ({
    sortOrder: line.sortOrder,
    productId: line.productId,
    productName: line.productName,
    sku: line.sku,
    unitOfMeasurement: line.unitOfMeasurement,
    hsnSac: line.hsnSac,
    taxRateBps: line.taxRateBps,
    quantity: toQuantityDecimalForPrisma(line.quantity),
    unitPrice: toDecimalForPrisma(line.unitPrice),
    discount: toDecimalForPrisma(line.discount),
    lineSubtotal: toDecimalForPrisma(line.lineSubtotal),
    taxableAmount: toDecimalForPrisma(line.taxableAmount),
    cgst: toDecimalForPrisma(line.cgst),
    sgst: toDecimalForPrisma(line.sgst),
    igst: toDecimalForPrisma(line.igst),
    totalTax: toDecimalForPrisma(line.totalTax),
    lineTotal: toDecimalForPrisma(line.lineTotal),
    supplyType: line.supplyType,
    treatment: line.treatment,
  }));
}

function headerData(prepared: PreparedPurchase) {
  return {
    supplierId: prepared.supplierId,
    supplierName: prepared.supplierName,
    issuedOn: prepared.issuedOn,
    dueOn: prepared.dueOn,
    notes: prepared.notes,
    placeOfSupplyStateCode: prepared.placeOfSupplyStateCode,
    subtotal: toDecimalForPrisma(prepared.subtotal),
    discountTotal: toDecimalForPrisma(prepared.discountTotal),
    taxableAmount: toDecimalForPrisma(prepared.taxableAmount),
    cgst: toDecimalForPrisma(prepared.cgst),
    sgst: toDecimalForPrisma(prepared.sgst),
    igst: toDecimalForPrisma(prepared.igst),
    totalTax: toDecimalForPrisma(prepared.totalTax),
    grandTotal: toDecimalForPrisma(prepared.grandTotal),
    supplyType: prepared.supplyType,
  };
}

function mapLine(record: {
  id: string;
  tenantId: string;
  purchaseId: string;
  sortOrder: number;
  productId: string;
  productName: string;
  sku: string;
  unitOfMeasurement: string;
  hsnSac: string | null;
  taxRateBps: number;
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  discount: { toString(): string };
  lineSubtotal: { toString(): string };
  taxableAmount: { toString(): string };
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  lineTotal: { toString(): string };
  supplyType: string;
  treatment: string;
}): PurchaseLine {
  return {
    id: record.id,
    tenantId: record.tenantId,
    purchaseId: record.purchaseId,
    sortOrder: record.sortOrder,
    productId: record.productId,
    productName: record.productName,
    sku: record.sku,
    unitOfMeasurement: record.unitOfMeasurement,
    hsnSac: record.hsnSac,
    taxRateBps: record.taxRateBps,
    quantity: quantityFromPrismaDecimal(record.quantity),
    unitPrice: moneyFromPrismaDecimal(record.unitPrice),
    discount: moneyFromPrismaDecimal(record.discount),
    lineSubtotal: moneyFromPrismaDecimal(record.lineSubtotal),
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    lineTotal: moneyFromPrismaDecimal(record.lineTotal),
    supplyType: mapLineSupplyType(record.supplyType),
    treatment: mapTreatment(record.treatment),
  };
}

function mapPurchase(record: {
  id: string;
  tenantId: string;
  number: string;
  supplierId: string;
  supplierName: string;
  status: string;
  journalId: string | null;
  issuedOn: string;
  dueOn: string | null;
  notes: string | null;
  placeOfSupplyStateCode: string;
  subtotal: { toString(): string };
  discountTotal: { toString(): string };
  taxableAmount: { toString(): string };
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  grandTotal: { toString(): string };
  supplyType: string;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: Parameters<typeof mapLine>[0][];
}): Purchase {
  return {
    id: record.id,
    tenantId: record.tenantId,
    number: record.number,
    supplierId: record.supplierId,
    supplierName: record.supplierName,
    status: mapPurchaseStatus(record.status),
    journalId: record.journalId,
    issuedOn: businessDate(record.issuedOn),
    dueOn: record.dueOn ? businessDate(record.dueOn) : null,
    notes: record.notes,
    placeOfSupplyStateCode: record.placeOfSupplyStateCode,
    subtotal: moneyFromPrismaDecimal(record.subtotal),
    discountTotal: moneyFromPrismaDecimal(record.discountTotal),
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    grandTotal: moneyFromPrismaDecimal(record.grandTotal),
    supplyType: mapSupplyType(record.supplyType),
    postedAt: record.postedAt,
    lines: [...record.lines]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapLine),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function purchaseWhereConditions(filter: PurchaseListFilter): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`p."tenantId" = ${filter.tenantId}`];
  if (filter.supplierId) {
    conditions.push(Prisma.sql`p."supplierId" = ${filter.supplierId}`);
  }
  const statuses =
    filter.statuses && filter.statuses.length > 0
      ? [...filter.statuses]
      : !filter.status || filter.status === "ALL"
        ? undefined
        : [filter.status];
  if (statuses) {
    conditions.push(Prisma.sql`p.status IN (${Prisma.join(statuses)})`);
  }
  if (filter.fromDate) {
    conditions.push(Prisma.sql`p."issuedOn" >= ${filter.fromDate}`);
  }
  if (filter.toDate) {
    conditions.push(Prisma.sql`p."issuedOn" <= ${filter.toDate}`);
  }
  const query = filter.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      p.number ILIKE ${pattern}
      OR p."supplierName" ILIKE ${pattern}
    )`);
  }
  return conditions;
}

export function createPrismaPurchasesRepository(
  client: PrismaPurchasesClient
): PurchasesRepository {
  return {
    async allocateNextPurchaseNumber(tenantId, financialYearKey) {
      try {
        const series = await client.purchaseNumberSeries.upsert({
          where: {
            tenantId_financialYearKey: { tenantId, financialYearKey },
          },
          create: { tenantId, financialYearKey, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return series.lastNumber;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          const series = await client.purchaseNumberSeries.upsert({
            where: {
              tenantId_financialYearKey: { tenantId, financialYearKey },
            },
            create: { tenantId, financialYearKey, lastNumber: 1 },
            update: { lastNumber: { increment: 1 } },
          });
          return series.lastNumber;
        }
        throw error;
      }
    },

    async createPurchase(input) {
      const record = await client.purchase.create({
        data: {
          tenantId: input.tenantId,
          number: input.number,
          status: "DRAFT",
          ...headerData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapPurchase(record);
    },

    async updatePurchase(input) {
      const existing = await client.purchase.findFirst({
        where: {
          id: input.purchaseId,
          tenantId: input.tenantId,
          status: input.expectedStatus,
        },
      });
      if (!existing) {
        return null;
      }

      const record = await client.purchase.update({
        where: { id: existing.id },
        data: {
          ...headerData(input.prepared),
          lines: {
            deleteMany: { tenantId: input.tenantId },
            create: lineCreateData(input.prepared),
          },
        },
        include: { lines: true },
      });
      return mapPurchase(record);
    },

    async markPurchasePosted(input) {
      const existing = await client.purchase.findFirst({
        where: {
          id: input.purchaseId,
          tenantId: input.tenantId,
          status: input.expectedStatus,
        },
      });
      if (!existing) {
        return null;
      }
      const record = await client.purchase.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          journalId: input.journalId,
          postedAt: input.postedAt,
        },
        include: { lines: true },
      });
      return mapPurchase(record);
    },

    async updatePurchaseStatus(input) {
      const existing = await client.purchase.findFirst({
        where: { id: input.purchaseId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      const record = await client.purchase.update({
        where: { id: existing.id },
        data: { status: input.status },
        include: { lines: true },
      });
      return mapPurchase(record);
    },

    async lockPurchaseForUpdate(tenantId, purchaseId) {
      if (client === prisma) {
        throw new Error(
          "lockPurchaseForUpdate requires a transaction-bound Prisma client. " +
            "Use prisma.$transaction() and pass the transaction client to createPrismaPurchasesRepository()."
        );
      }
      await client.$queryRaw`
        SELECT id FROM purchases
        WHERE id = ${purchaseId} AND "tenantId" = ${tenantId}
        FOR UPDATE
      `;
      const record = await client.purchase.findFirst({
        where: { id: purchaseId, tenantId },
        include: { lines: true },
      });
      return record ? mapPurchase(record) : null;
    },

    async findPurchaseById(tenantId, purchaseId) {
      const record = await client.purchase.findFirst({
        where: { id: purchaseId, tenantId },
        include: { lines: true },
      });
      return record ? mapPurchase(record) : null;
    },

    async listPurchases(filter) {
      const query = filter.query?.trim();
      const statuses =
        filter.statuses && filter.statuses.length > 0
          ? [...filter.statuses]
          : !filter.status || filter.status === "ALL"
            ? undefined
            : [filter.status];

      const where: Prisma.PurchaseWhereInput = {
        tenantId: filter.tenantId,
        supplierId: filter.supplierId,
        status: statuses ? { in: statuses } : undefined,
        ...(filter.fromDate || filter.toDate
          ? {
              issuedOn: {
                ...(filter.fromDate ? { gte: filter.fromDate } : {}),
                ...(filter.toDate ? { lte: filter.toDate } : {}),
              },
            }
          : {}),
        ...(query
          ? {
              OR: [
                { number: { contains: query, mode: "insensitive" } },
                { supplierName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const records = await client.purchase.findMany({
        where,
        include: { lines: true },
        orderBy: [{ issuedOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapPurchase);
    },

    async listPurchasesPage(filter) {
      return fetchOrderedPage({
        client,
        tenantId: filter.tenantId,
        listKey: "bills",
        fromSql: Prisma.sql`purchases p`,
        idColumn: Prisma.sql`p.id`,
        whereConditions: purchaseWhereConditions(filter),
        defaultOrderSql: Prisma.sql`p."issuedOn" DESC, p.number DESC`,
        page: filter.page,
        pageSize: filter.pageSize,
        fetchByIds: async (ids) => {
          const records = await client.purchase.findMany({
            where: { tenantId: filter.tenantId, id: { in: ids } },
            include: { lines: true },
          });
          return records.map(mapPurchase);
        },
        getId: (purchase) => purchase.id,
      });
    },
  };
}

export const prismaPurchasesRepository = createPrismaPurchasesRepository(prisma);
