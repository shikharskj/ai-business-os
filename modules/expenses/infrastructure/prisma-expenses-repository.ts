import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fetchOrderedPage } from "@/modules/list-order/infrastructure/ordered-page";
import { businessDate } from "@/modules/shared-kernel/dates";
import { moneyFromPrismaDecimal, toDecimalForPrisma } from "@/modules/shared-kernel/money";
import { PAYMENT_METHODS, type PaymentMethod } from "@/modules/payments/domain/types";
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
} from "@/modules/expenses/domain/types";
import type { ExpenseRepository } from "@/modules/expenses/infrastructure/repositories";
import type { GstSupplyType, GstTreatment } from "@/modules/tax/domain/types";

type PrismaExpenseClient = Pick<
  PrismaClient,
  "expense" | "expenseNumberSeries" | "$queryRaw"
>;

const METHODS = new Set<PaymentMethod>(PAYMENT_METHODS);
const CATEGORIES = new Set<ExpenseCategory>(EXPENSE_CATEGORIES);
const SUPPLY_TYPES = new Set<GstSupplyType>(["INTRA_STATE", "INTER_STATE", "NONE"]);
const TREATMENTS = new Set<GstTreatment>([
  "STANDARD",
  "NOT_REGISTERED",
  "COMPOSITION",
  "UNREGISTERED_COUNTERPARTY",
  "EXEMPT",
]);

function mapMethod(value: string): PaymentMethod {
  if (!METHODS.has(value as PaymentMethod)) {
    throw new Error("Unknown payment method.");
  }
  return value as PaymentMethod;
}

function mapCategory(value: string): ExpenseCategory {
  if (!CATEGORIES.has(value as ExpenseCategory)) {
    throw new Error("Unknown expense category.");
  }
  return value as ExpenseCategory;
}

function mapSupplyType(value: string): GstSupplyType {
  if (!SUPPLY_TYPES.has(value as GstSupplyType)) {
    throw new Error("Unknown GST supply type.");
  }
  return value as GstSupplyType;
}

function mapTreatment(value: string): GstTreatment {
  if (!TREATMENTS.has(value as GstTreatment)) {
    throw new Error("Unknown GST treatment.");
  }
  return value as GstTreatment;
}

function mapExpense(record: {
  id: string;
  tenantId: string;
  number: string;
  category: string;
  incurredOn: string;
  method: string;
  vendorGstin: string | null;
  notes: string | null;
  taxableAmount: { toString(): string };
  taxRateBps: number;
  cgst: { toString(): string };
  sgst: { toString(): string };
  igst: { toString(): string };
  totalTax: { toString(): string };
  grandTotal: { toString(): string };
  supplyType: string;
  treatment: string;
  journalId: string;
  createdAt: Date;
  updatedAt: Date;
}): Expense {
  return {
    id: record.id,
    tenantId: record.tenantId,
    number: record.number,
    category: mapCategory(record.category),
    incurredOn: businessDate(record.incurredOn),
    method: mapMethod(record.method),
    vendorGstin: record.vendorGstin,
    notes: record.notes,
    taxableAmount: moneyFromPrismaDecimal(record.taxableAmount),
    taxRateBps: record.taxRateBps,
    cgst: moneyFromPrismaDecimal(record.cgst),
    sgst: moneyFromPrismaDecimal(record.sgst),
    igst: moneyFromPrismaDecimal(record.igst),
    totalTax: moneyFromPrismaDecimal(record.totalTax),
    grandTotal: moneyFromPrismaDecimal(record.grandTotal),
    supplyType: mapSupplyType(record.supplyType),
    treatment: mapTreatment(record.treatment),
    journalId: record.journalId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function expenseWhereConditions(filter: {
  tenantId: string;
  query?: string;
  category?: ExpenseCategory;
  fromDate?: string;
  toDate?: string;
}): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`e."tenantId" = ${filter.tenantId}`];
  if (filter.category) {
    conditions.push(Prisma.sql`e.category = ${filter.category}`);
  }
  if (filter.fromDate) {
    conditions.push(Prisma.sql`e."incurredOn" >= ${filter.fromDate}`);
  }
  if (filter.toDate) {
    conditions.push(Prisma.sql`e."incurredOn" <= ${filter.toDate}`);
  }
  const query = filter.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      e.number ILIKE ${pattern}
      OR COALESCE(e.notes, '') ILIKE ${pattern}
      OR COALESCE(e."vendorGstin", '') ILIKE ${pattern}
    )`);
  }
  return conditions;
}

export function createPrismaExpenseRepository(
  client: PrismaExpenseClient = prisma
): ExpenseRepository {
  return {
    async allocateNextExpenseNumber(tenantId, financialYearKey) {
      try {
        const series = await client.expenseNumberSeries.upsert({
          where: {
            tenantId_financialYearKey: { tenantId, financialYearKey },
          },
          create: { tenantId, financialYearKey, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        return series.lastNumber;
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          const series = await client.expenseNumberSeries.upsert({
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

    async createExpense(input) {
      const record = await client.expense.create({
        data: {
          id: input.id,
          tenantId: input.tenantId,
          number: input.number,
          category: input.category,
          incurredOn: input.incurredOn,
          method: input.method,
          vendorGstin: input.vendorGstin,
          notes: input.notes,
          taxableAmount: toDecimalForPrisma(input.taxableAmount),
          taxRateBps: input.taxRateBps,
          cgst: toDecimalForPrisma(input.cgst),
          sgst: toDecimalForPrisma(input.sgst),
          igst: toDecimalForPrisma(input.igst),
          totalTax: toDecimalForPrisma(input.totalTax),
          grandTotal: toDecimalForPrisma(input.grandTotal),
          supplyType: input.supplyType,
          treatment: input.treatment,
          journalId: input.journalId,
        },
      });
      return mapExpense(record);
    },

    async findExpenseById(tenantId, expenseId) {
      const record = await client.expense.findFirst({
        where: { id: expenseId, tenantId },
      });
      return record ? mapExpense(record) : null;
    },

    async listExpenses(filter) {
      const query = filter.query?.trim();
      const where: Prisma.ExpenseWhereInput = {
        tenantId: filter.tenantId,
        category: filter.category,
        incurredOn: {
          ...(filter.fromDate ? { gte: filter.fromDate } : {}),
          ...(filter.toDate ? { lte: filter.toDate } : {}),
        },
        ...(query
          ? {
              OR: [
                { number: { contains: query, mode: "insensitive" } },
                { notes: { contains: query, mode: "insensitive" } },
                { vendorGstin: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      if (!filter.fromDate && !filter.toDate) {
        delete where.incurredOn;
      }
      const records = await client.expense.findMany({
        where,
        orderBy: [{ incurredOn: "desc" }, { number: "desc" }],
      });
      return records.map(mapExpense);
    },

    async listExpensesPage(filter) {
      return fetchOrderedPage({
        client,
        tenantId: filter.tenantId,
        listKey: "expenses",
        fromSql: Prisma.sql`expenses e`,
        idColumn: Prisma.sql`e.id`,
        whereConditions: expenseWhereConditions({
          tenantId: filter.tenantId,
          query: filter.query,
          category: filter.category,
          fromDate: filter.fromDate,
          toDate: filter.toDate,
        }),
        defaultOrderSql: Prisma.sql`e."incurredOn" DESC, e.number DESC`,
        page: filter.page,
        pageSize: filter.pageSize,
        fetchByIds: async (ids) => {
          const records = await client.expense.findMany({
            where: { tenantId: filter.tenantId, id: { in: ids } },
          });
          return records.map(mapExpense);
        },
        getId: (expense) => expense.id,
      });
    },
  };
}

export const prismaExpenseRepository = createPrismaExpenseRepository(prisma);
