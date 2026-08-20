import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fetchOrderedPage } from "@/modules/list-order/infrastructure/ordered-page";
import { businessDate } from "@/modules/shared-kernel/dates";
import {
  money,
  moneyFromPrismaDecimal,
  toDecimalForPrisma,
  type Money,
} from "@/modules/shared-kernel/money";
import type {
  PaymentMethod,
  SupplierPayment,
  SupplierPaymentAllocation,
} from "@/modules/payments/domain/types";
import { PAYMENT_METHODS } from "@/modules/payments/domain/types";
import type { SupplierPaymentRepository } from "@/modules/payments/infrastructure/supplier-payment-repositories";
import type { SupplierPaymentListFilter } from "@/modules/payments/domain/types";

type PrismaSupplierPaymentClient = Pick<
  PrismaClient,
  | "supplierPayment"
  | "supplierPaymentAllocation"
  | "supplierPaymentNumberSeries"
  | "$queryRaw"
>;

const METHODS = new Set<PaymentMethod>(PAYMENT_METHODS);

function mapMethod(value: string): PaymentMethod {
  if (!METHODS.has(value as PaymentMethod)) {
    throw new Error("Unknown payment method.");
  }
  return value as PaymentMethod;
}

function mapAllocation(record: {
  id: string;
  tenantId: string;
  paymentId: string;
  purchaseId: string;
  amount: { toString(): string };
  purchase: { number: string };
}): SupplierPaymentAllocation {
  return {
    id: record.id,
    tenantId: record.tenantId,
    paymentId: record.paymentId,
    purchaseId: record.purchaseId,
    purchaseNumber: record.purchase.number,
    amount: moneyFromPrismaDecimal(record.amount),
  };
}

function mapPayment(record: {
  id: string;
  tenantId: string;
  number: string;
  supplierId: string;
  supplierName: string;
  paidOn: string;
  method: string;
  amount: { toString(): string };
  reference: string | null;
  notes: string | null;
  journalId: string;
  createdAt: Date;
  updatedAt: Date;
  allocations: Array<{
    id: string;
    tenantId: string;
    paymentId: string;
    purchaseId: string;
    amount: { toString(): string };
    purchase: { number: string };
  }>;
}): SupplierPayment {
  return {
    id: record.id,
    tenantId: record.tenantId,
    number: record.number,
    supplierId: record.supplierId,
    supplierName: record.supplierName,
    paidOn: businessDate(record.paidOn),
    method: mapMethod(record.method),
    amount: moneyFromPrismaDecimal(record.amount),
    reference: record.reference,
    notes: record.notes,
    journalId: record.journalId,
    allocations: record.allocations.map(mapAllocation),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

const paymentInclude = {
  allocations: {
    include: { purchase: { select: { number: true } } },
  },
} as const;

function paymentWhereConditions(filter: SupplierPaymentListFilter): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`sp."tenantId" = ${filter.tenantId}`];
  if (filter.supplierId) {
    conditions.push(Prisma.sql`sp."supplierId" = ${filter.supplierId}`);
  }
  if (filter.method) {
    conditions.push(Prisma.sql`sp.method = ${filter.method}`);
  }
  if (filter.fromDate) {
    conditions.push(Prisma.sql`sp."paidOn" >= ${filter.fromDate}`);
  }
  if (filter.toDate) {
    conditions.push(Prisma.sql`sp."paidOn" <= ${filter.toDate}`);
  }
  const query = filter.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      sp.number ILIKE ${pattern}
      OR sp."supplierName" ILIKE ${pattern}
    )`);
  }
  return conditions;
}

export function createPrismaSupplierPaymentRepository(
  client: PrismaSupplierPaymentClient = prisma
): SupplierPaymentRepository {
  return {
    async allocateNextPaymentNumber(tenantId, financialYearKey) {
      try {
        const series = await client.supplierPaymentNumberSeries.upsert({
          where: {
            tenantId_financialYearKey: { tenantId, financialYearKey },
          },
          create: { tenantId, financialYearKey, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return series.lastNumber;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          throw error;
        }
        throw error;
      }
    },

    async createPayment(input) {
      const record = await client.supplierPayment.create({
        data: {
          id: input.id,
          tenantId: input.tenantId,
          number: input.number,
          supplierId: input.supplierId,
          supplierName: input.supplierName,
          paidOn: input.paidOn,
          method: input.method,
          amount: toDecimalForPrisma(input.amount),
          reference: input.reference,
          notes: input.notes,
          journalId: input.journalId,
          allocations: {
            create: input.allocations.map((allocation) => ({
              tenantId: input.tenantId,
              purchaseId: allocation.purchaseId,
              amount: toDecimalForPrisma(allocation.amount),
            })),
          },
        },
        include: paymentInclude,
      });
      return mapPayment(record);
    },

    async findPaymentById(tenantId, paymentId) {
      const record = await client.supplierPayment.findFirst({
        where: { id: paymentId, tenantId },
        include: paymentInclude,
      });
      return record ? mapPayment(record) : null;
    },

    async listPayments(filter) {
      const query = filter.query?.trim();
      const where: Prisma.SupplierPaymentWhereInput = {
        tenantId: filter.tenantId,
        supplierId: filter.supplierId,
        ...(filter.method ? { method: filter.method } : {}),
        ...(filter.fromDate ? { paidOn: { gte: filter.fromDate } } : {}),
        ...(filter.toDate
          ? {
              paidOn: filter.fromDate
                ? { gte: filter.fromDate, lte: filter.toDate }
                : { lte: filter.toDate },
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
      const records = await client.supplierPayment.findMany({
        where,
        include: paymentInclude,
        orderBy: [{ paidOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapPayment);
    },

    async listPaymentsPage(filter) {
      return fetchOrderedPage({
        client,
        tenantId: filter.tenantId,
        listKey: "supplier-payments",
        fromSql: Prisma.sql`supplier_payments sp`,
        idColumn: Prisma.sql`sp.id`,
        whereConditions: paymentWhereConditions(filter),
        defaultOrderSql: Prisma.sql`sp."paidOn" DESC, sp.number DESC`,
        page: filter.page,
        pageSize: filter.pageSize,
        fetchByIds: async (ids) => {
          const records = await client.supplierPayment.findMany({
            where: { tenantId: filter.tenantId, id: { in: ids } },
            include: paymentInclude,
          });
          return records.map(mapPayment);
        },
        getId: (payment) => payment.id,
      });
    },

    async listPaymentsForPurchase(tenantId, purchaseId) {
      const records = await client.supplierPayment.findMany({
        where: {
          tenantId,
          allocations: { some: { purchaseId, tenantId } },
        },
        include: paymentInclude,
        orderBy: [{ paidOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapPayment);
    },

    async allocatedTotalsForPurchases(tenantId, purchaseIds) {
      const totals = new Map<string, Money>();
      if (purchaseIds.length === 0) {
        return totals;
      }
      const grouped = await client.supplierPaymentAllocation.groupBy({
        by: ["purchaseId"],
        where: { tenantId, purchaseId: { in: purchaseIds } },
        _sum: { amount: true },
      });
      for (const purchaseId of purchaseIds) {
        totals.set(purchaseId, money(0n));
      }
      for (const row of grouped) {
        totals.set(
          row.purchaseId,
          row._sum.amount ? moneyFromPrismaDecimal(row._sum.amount) : money(0n)
        );
      }
      return totals;
    },
  };
}

export const prismaSupplierPaymentRepository =
  createPrismaSupplierPaymentRepository(prisma);
