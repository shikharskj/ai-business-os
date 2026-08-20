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
  CustomerPayment,
  PaymentAllocation,
  PaymentMethod,
} from "@/modules/payments/domain/types";
import { PAYMENT_METHODS } from "@/modules/payments/domain/types";
import type { PaymentRepository } from "@/modules/payments/infrastructure/repositories";
import type { PaymentListFilter } from "@/modules/payments/domain/types";

type PrismaPaymentClient = Pick<
  PrismaClient,
  | "customerPayment"
  | "customerPaymentAllocation"
  | "customerPaymentNumberSeries"
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
  invoiceId: string;
  amount: { toString(): string };
  invoice: { number: string };
}): PaymentAllocation {
  return {
    id: record.id,
    tenantId: record.tenantId,
    paymentId: record.paymentId,
    invoiceId: record.invoiceId,
    invoiceNumber: record.invoice.number,
    amount: moneyFromPrismaDecimal(record.amount),
  };
}

function mapPayment(record: {
  id: string;
  tenantId: string;
  number: string;
  customerId: string;
  customerName: string;
  receivedOn: string;
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
    invoiceId: string;
    amount: { toString(): string };
    invoice: { number: string };
  }>;
}): CustomerPayment {
  return {
    id: record.id,
    tenantId: record.tenantId,
    number: record.number,
    customerId: record.customerId,
    customerName: record.customerName,
    receivedOn: businessDate(record.receivedOn),
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
    include: { invoice: { select: { number: true } } },
  },
} as const;

function paymentWhereConditions(filter: PaymentListFilter): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`cp."tenantId" = ${filter.tenantId}`];
  if (filter.customerId) {
    conditions.push(Prisma.sql`cp."customerId" = ${filter.customerId}`);
  }
  const query = filter.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      cp.number ILIKE ${pattern}
      OR cp."customerName" ILIKE ${pattern}
    )`);
  }
  return conditions;
}

export function createPrismaPaymentRepository(
  client: PrismaPaymentClient = prisma
): PaymentRepository {
  return {
    async allocateNextPaymentNumber(tenantId, financialYearKey) {
      try {
        const series = await client.customerPaymentNumberSeries.upsert({
          where: {
            tenantId_financialYearKey: { tenantId, financialYearKey },
          },
          create: { tenantId, financialYearKey, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return series.lastNumber;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          const series = await client.customerPaymentNumberSeries.upsert({
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

    async createPayment(input) {
      const record = await client.customerPayment.create({
        data: {
          id: input.id,
          tenantId: input.tenantId,
          number: input.number,
          customerId: input.customerId,
          customerName: input.customerName,
          receivedOn: input.receivedOn,
          method: input.method,
          amount: toDecimalForPrisma(input.amount),
          reference: input.reference,
          notes: input.notes,
          journalId: input.journalId,
          allocations: {
            create: input.allocations.map((allocation) => ({
              tenantId: input.tenantId,
              invoiceId: allocation.invoiceId,
              amount: toDecimalForPrisma(allocation.amount),
            })),
          },
        },
        include: paymentInclude,
      });
      return mapPayment(record);
    },

    async findPaymentById(tenantId, paymentId) {
      const record = await client.customerPayment.findFirst({
        where: { id: paymentId, tenantId },
        include: paymentInclude,
      });
      return record ? mapPayment(record) : null;
    },

    async listPayments(filter) {
      const query = filter.query?.trim();
      const where: Prisma.CustomerPaymentWhereInput = {
        tenantId: filter.tenantId,
        customerId: filter.customerId,
        ...(query
          ? {
              OR: [
                { number: { contains: query, mode: "insensitive" } },
                { customerName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      const records = await client.customerPayment.findMany({
        where,
        include: paymentInclude,
        orderBy: [{ receivedOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapPayment);
    },

    async listPaymentsPage(filter) {
      return fetchOrderedPage({
        client,
        tenantId: filter.tenantId,
        listKey: "payments",
        fromSql: Prisma.sql`customer_payments cp`,
        idColumn: Prisma.sql`cp.id`,
        whereConditions: paymentWhereConditions(filter),
        defaultOrderSql: Prisma.sql`cp."receivedOn" DESC, cp.number DESC`,
        page: filter.page,
        pageSize: filter.pageSize,
        fetchByIds: async (ids) => {
          const records = await client.customerPayment.findMany({
            where: { tenantId: filter.tenantId, id: { in: ids } },
            include: paymentInclude,
          });
          return records.map(mapPayment);
        },
        getId: (payment) => payment.id,
      });
    },

    async listPaymentsForInvoice(tenantId, invoiceId) {
      const records = await client.customerPayment.findMany({
        where: {
          tenantId,
          allocations: { some: { invoiceId, tenantId } },
        },
        include: paymentInclude,
        orderBy: [{ receivedOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapPayment);
    },

    async allocatedTotalsForInvoices(tenantId, invoiceIds) {
      const totals = new Map<string, Money>();
      if (invoiceIds.length === 0) {
        return totals;
      }
      const grouped = await client.customerPaymentAllocation.groupBy({
        by: ["invoiceId"],
        where: { tenantId, invoiceId: { in: invoiceIds } },
        _sum: { amount: true },
      });
      for (const invoiceId of invoiceIds) {
        totals.set(invoiceId, money(0n));
      }
      for (const row of grouped) {
        totals.set(
          row.invoiceId,
          row._sum.amount ? moneyFromPrismaDecimal(row._sum.amount) : money(0n)
        );
      }
      return totals;
    },
  };
}

export const prismaPaymentRepository = createPrismaPaymentRepository(prisma);
