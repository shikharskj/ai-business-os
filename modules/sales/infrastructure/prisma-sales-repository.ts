import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
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
  Quotation,
  QuotationLine,
  QuotationStatus,
  SalesInvoice,
  SalesInvoiceLine,
  SalesInvoiceStatus,
} from "@/modules/sales/domain/types";
import type { SalesRepository } from "@/modules/sales/infrastructure/repositories";
import type { PreparedInvoice, PreparedQuotation } from "@/modules/sales/domain/types";

type PrismaSalesClient = Pick<
  PrismaClient,
  | "quotation"
  | "quotationLine"
  | "quotationNumberSeries"
  | "salesInvoice"
  | "salesInvoiceLine"
  | "invoiceNumberSeries"
  | "$queryRaw"
>;

const QUOTATION_STATUSES = new Set<QuotationStatus>([
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "CANCELLED",
  "CONVERTED",
]);

const INVOICE_STATUSES = new Set<SalesInvoiceStatus>([
  "DRAFT",
  "POSTED",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
]);

function mapStatus(value: string): QuotationStatus {
  if (!QUOTATION_STATUSES.has(value as QuotationStatus)) {
    throw new Error("Unknown quotation status.");
  }
  return value as QuotationStatus;
}

function mapInvoiceStatus(value: string): SalesInvoiceStatus {
  if (!INVOICE_STATUSES.has(value as SalesInvoiceStatus)) {
    throw new Error("Unknown invoice status.");
  }
  return value as SalesInvoiceStatus;
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

function lineCreateData(prepared: PreparedQuotation | PreparedInvoice) {
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

function headerData(prepared: PreparedQuotation | PreparedInvoice) {
  const base = {
    customerId: prepared.customerId,
    customerName: prepared.customerName,
    issuedOn: prepared.issuedOn,
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
  if ("validUntil" in prepared) {
    return { ...base, validUntil: prepared.validUntil };
  }
  return { ...base, dueOn: prepared.dueOn };
}

function mapLine(record: {
  id: string;
  tenantId: string;
  quotationId: string;
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
}): QuotationLine {
  return {
    id: record.id,
    tenantId: record.tenantId,
    quotationId: record.quotationId,
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

function mapQuotation(record: {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  status: string;
  issuedOn: string;
  validUntil: string | null;
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
  createdAt: Date;
  updatedAt: Date;
  lines: Parameters<typeof mapLine>[0][];
}): Quotation {
  return {
    id: record.id,
    tenantId: record.tenantId,
    number: record.number,
    customerId: record.customerId,
    customerName: record.customerName,
    status: mapStatus(record.status),
    issuedOn: businessDate(record.issuedOn),
    validUntil: record.validUntil ? businessDate(record.validUntil) : null,
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
    lines: [...record.lines]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapLine),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapInvoiceLine(record: {
  id: string;
  tenantId: string;
  invoiceId: string;
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
}): SalesInvoiceLine {
  return {
    id: record.id,
    tenantId: record.tenantId,
    invoiceId: record.invoiceId,
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

function mapInvoice(record: {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  status: string;
  quotationId: string | null;
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
  lines: Parameters<typeof mapInvoiceLine>[0][];
}): SalesInvoice {
  return {
    id: record.id,
    tenantId: record.tenantId,
    number: record.number,
    customerId: record.customerId,
    customerName: record.customerName,
    status: mapInvoiceStatus(record.status),
    quotationId: record.quotationId,
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
      .map(mapInvoiceLine),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function createPrismaSalesRepository(client: PrismaSalesClient): SalesRepository {
  return {
    async allocateNextQuotationNumber(tenantId, financialYearKey) {
      try {
        const series = await client.quotationNumberSeries.upsert({
          where: {
            tenantId_financialYearKey: { tenantId, financialYearKey },
          },
          create: { tenantId, financialYearKey, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return series.lastNumber;
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          const series = await client.quotationNumberSeries.upsert({
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

    async createQuotation(input) {
      const record = await client.quotation.create({
        data: {
          tenantId: input.tenantId,
          number: input.number,
          status: "DRAFT",
          ...headerData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapQuotation(record);
    },

    async updateQuotation(input) {
      const existing = await client.quotation.findFirst({
        where: { id: input.quotationId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }

      await client.quotationLine.deleteMany({
        where: { quotationId: existing.id, tenantId: input.tenantId },
      });

      const record = await client.quotation.update({
        where: { id: existing.id },
        data: {
          ...headerData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapQuotation(record);
    },

    async updateQuotationStatus(input) {
      const existing = await client.quotation.findFirst({
        where: { id: input.quotationId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      const record = await client.quotation.update({
        where: { id: existing.id },
        data: { status: input.status },
        include: { lines: true },
      });
      return mapQuotation(record);
    },

    async findQuotationById(tenantId, quotationId) {
      const record = await client.quotation.findFirst({
        where: { id: quotationId, tenantId },
        include: { lines: true },
      });
      return record ? mapQuotation(record) : null;
    },

    async listQuotations(filter) {
      const query = filter.query?.trim();
      const statusFilter =
        !filter.status || filter.status === "ALL" ? undefined : filter.status;

      const where: Prisma.QuotationWhereInput = {
        tenantId: filter.tenantId,
        status: statusFilter,
        ...(query
          ? {
              OR: [
                { number: { contains: query, mode: "insensitive" } },
                { customerName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const records = await client.quotation.findMany({
        where,
        include: { lines: true },
        orderBy: [{ issuedOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapQuotation);
    },

    async allocateNextInvoiceNumber(tenantId, financialYearKey) {
      try {
        const series = await client.invoiceNumberSeries.upsert({
          where: {
            tenantId_financialYearKey: { tenantId, financialYearKey },
          },
          create: { tenantId, financialYearKey, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return series.lastNumber;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          const series = await client.invoiceNumberSeries.upsert({
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

    async createInvoice(input) {
      const record = await client.salesInvoice.create({
        data: {
          tenantId: input.tenantId,
          number: input.number,
          status: "DRAFT",
          quotationId: input.quotationId ?? null,
          ...headerData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapInvoice(record);
    },

    async updateInvoice(input) {
      const existing = await client.salesInvoice.findFirst({
        where: { id: input.invoiceId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }

      await client.salesInvoiceLine.deleteMany({
        where: { invoiceId: existing.id, tenantId: input.tenantId },
      });

      const record = await client.salesInvoice.update({
        where: { id: existing.id },
        data: {
          ...headerData(input.prepared),
          lines: { create: lineCreateData(input.prepared) },
        },
        include: { lines: true },
      });
      return mapInvoice(record);
    },

    async markInvoicePosted(input) {
      const existing = await client.salesInvoice.findFirst({
        where: { id: input.invoiceId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      const record = await client.salesInvoice.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          journalId: input.journalId,
          postedAt: input.postedAt,
        },
        include: { lines: true },
      });
      return mapInvoice(record);
    },

    async updateInvoiceStatus(input) {
      const existing = await client.salesInvoice.findFirst({
        where: { id: input.invoiceId, tenantId: input.tenantId },
      });
      if (!existing) {
        return null;
      }
      const record = await client.salesInvoice.update({
        where: { id: existing.id },
        data: { status: input.status },
        include: { lines: true },
      });
      return mapInvoice(record);
    },

    async lockInvoiceForUpdate(tenantId, invoiceId) {
      await client.$queryRaw`
        SELECT id FROM sales_invoices
        WHERE id = ${invoiceId} AND "tenantId" = ${tenantId}
        FOR UPDATE
      `;
      const record = await client.salesInvoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { lines: true },
      });
      return record ? mapInvoice(record) : null;
    },

    async findInvoiceById(tenantId, invoiceId) {
      const record = await client.salesInvoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { lines: true },
      });
      return record ? mapInvoice(record) : null;
    },

    async findInvoiceByQuotationId(tenantId, quotationId) {
      const record = await client.salesInvoice.findFirst({
        where: { quotationId, tenantId },
        include: { lines: true },
      });
      return record ? mapInvoice(record) : null;
    },

    async listInvoices(filter) {
      const query = filter.query?.trim();
      const statuses =
        filter.statuses && filter.statuses.length > 0
          ? [...filter.statuses]
          : !filter.status || filter.status === "ALL"
            ? undefined
            : [filter.status];

      const where: Prisma.SalesInvoiceWhereInput = {
        tenantId: filter.tenantId,
        customerId: filter.customerId,
        status: statuses ? { in: statuses } : undefined,
        ...(query
          ? {
              OR: [
                { number: { contains: query, mode: "insensitive" } },
                { customerName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const records = await client.salesInvoice.findMany({
        where,
        include: { lines: true },
        orderBy: [{ issuedOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapInvoice);
    },
  };
}

export const prismaSalesRepository = createPrismaSalesRepository(prisma);
