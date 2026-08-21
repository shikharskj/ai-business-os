import type { PrismaClient } from "@/generated/prisma/client";

import type { BusinessStateProjectionRepository } from "@/modules/business-state/domain/projection-repository";
import type {
  BusinessStateMetaSnapshot,
  InventoryRiskSnapshot,
  ReceivablesRiskSnapshot,
  SalesMomentumSnapshot,
} from "@/modules/business-state/domain/types";
import { businessDate } from "@/modules/shared-kernel/dates";
import {
  moneyFromPrismaDecimal,
  toDecimalForPrisma,
} from "@/modules/shared-kernel/money";

type PrismaProjectionClient = Pick<
  PrismaClient,
  | "businessStateMeta"
  | "receivablesRiskState"
  | "inventoryRiskState"
  | "salesMomentumState"
>;

export function createPrismaBusinessStateProjectionRepository(
  prisma: PrismaProjectionClient
): BusinessStateProjectionRepository {
  return {
    async upsertReceivablesRisk(snapshot) {
      await prisma.receivablesRiskState.upsert({
        where: { tenantId: snapshot.tenantId },
        create: {
          tenantId: snapshot.tenantId,
          openInvoiceCount: snapshot.openInvoiceCount,
          overdueInvoiceCount: snapshot.overdueInvoiceCount,
          totalOutstanding: toDecimalForPrisma(snapshot.totalOutstanding),
          overdueOutstanding: toDecimalForPrisma(snapshot.overdueOutstanding),
          currency: snapshot.currency,
          computedAt: snapshot.computedAt,
        },
        update: {
          openInvoiceCount: snapshot.openInvoiceCount,
          overdueInvoiceCount: snapshot.overdueInvoiceCount,
          totalOutstanding: toDecimalForPrisma(snapshot.totalOutstanding),
          overdueOutstanding: toDecimalForPrisma(snapshot.overdueOutstanding),
          currency: snapshot.currency,
          computedAt: snapshot.computedAt,
        },
      });
    },

    async upsertInventoryRisk(snapshot) {
      await prisma.inventoryRiskState.upsert({
        where: { tenantId: snapshot.tenantId },
        create: {
          tenantId: snapshot.tenantId,
          lowStockCount: snapshot.lowStockCount,
          thresholdMajor: snapshot.thresholdMajor,
          computedAt: snapshot.computedAt,
        },
        update: {
          lowStockCount: snapshot.lowStockCount,
          thresholdMajor: snapshot.thresholdMajor,
          computedAt: snapshot.computedAt,
        },
      });
    },

    async upsertSalesMomentum(snapshot) {
      await prisma.salesMomentumState.upsert({
        where: { tenantId: snapshot.tenantId },
        create: {
          tenantId: snapshot.tenantId,
          windowDays: snapshot.windowDays,
          windowFrom: snapshot.windowFrom,
          windowTo: snapshot.windowTo,
          postedInvoiceCount: snapshot.postedInvoiceCount,
          salesTotal: toDecimalForPrisma(snapshot.salesTotal),
          taxableTotal: toDecimalForPrisma(snapshot.taxableTotal),
          currency: snapshot.currency,
          computedAt: snapshot.computedAt,
        },
        update: {
          windowDays: snapshot.windowDays,
          windowFrom: snapshot.windowFrom,
          windowTo: snapshot.windowTo,
          postedInvoiceCount: snapshot.postedInvoiceCount,
          salesTotal: toDecimalForPrisma(snapshot.salesTotal),
          taxableTotal: toDecimalForPrisma(snapshot.taxableTotal),
          currency: snapshot.currency,
          computedAt: snapshot.computedAt,
        },
      });
    },

    async touchMeta({ tenantId, schemaVersion, rebuiltAt }) {
      const existing = await prisma.businessStateMeta.findUnique({
        where: { tenantId },
      });
      if (!existing) {
        await prisma.businessStateMeta.create({
          data: {
            tenantId,
            schemaVersion,
            rebuiltAt: rebuiltAt ?? null,
          },
        });
        return;
      }
      await prisma.businessStateMeta.update({
        where: { tenantId },
        data: {
          schemaVersion,
          ...(rebuiltAt !== undefined ? { rebuiltAt } : {}),
        },
      });
    },

    async getReceivablesRisk(tenantId) {
      const row = await prisma.receivablesRiskState.findUnique({
        where: { tenantId },
      });
      return row ? mapReceivables(row) : null;
    },

    async getInventoryRisk(tenantId) {
      const row = await prisma.inventoryRiskState.findUnique({
        where: { tenantId },
      });
      return row ? mapInventory(row) : null;
    },

    async getSalesMomentum(tenantId) {
      const row = await prisma.salesMomentumState.findUnique({
        where: { tenantId },
      });
      return row ? mapSalesMomentum(row) : null;
    },

    async getMeta(tenantId) {
      const row = await prisma.businessStateMeta.findUnique({
        where: { tenantId },
      });
      return row ? mapMeta(row) : null;
    },
  };
}

function mapReceivables(row: {
  tenantId: string;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  totalOutstanding: { toString(): string };
  overdueOutstanding: { toString(): string };
  currency: string;
  computedAt: Date;
}): ReceivablesRiskSnapshot {
  return {
    tenantId: row.tenantId,
    openInvoiceCount: row.openInvoiceCount,
    overdueInvoiceCount: row.overdueInvoiceCount,
    totalOutstanding: moneyFromPrismaDecimal(row.totalOutstanding),
    overdueOutstanding: moneyFromPrismaDecimal(row.overdueOutstanding),
    currency: row.currency,
    computedAt: row.computedAt,
  };
}

function mapInventory(row: {
  tenantId: string;
  lowStockCount: number;
  thresholdMajor: string;
  computedAt: Date;
}): InventoryRiskSnapshot {
  return {
    tenantId: row.tenantId,
    lowStockCount: row.lowStockCount,
    thresholdMajor: row.thresholdMajor,
    computedAt: row.computedAt,
  };
}

function mapSalesMomentum(row: {
  tenantId: string;
  windowDays: number;
  windowFrom: string;
  windowTo: string;
  postedInvoiceCount: number;
  salesTotal: { toString(): string };
  taxableTotal: { toString(): string };
  currency: string;
  computedAt: Date;
}): SalesMomentumSnapshot {
  return {
    tenantId: row.tenantId,
    windowDays: row.windowDays,
    windowFrom: businessDate(row.windowFrom),
    windowTo: businessDate(row.windowTo),
    postedInvoiceCount: row.postedInvoiceCount,
    salesTotal: moneyFromPrismaDecimal(row.salesTotal),
    taxableTotal: moneyFromPrismaDecimal(row.taxableTotal),
    currency: row.currency,
    computedAt: row.computedAt,
  };
}

function mapMeta(row: {
  tenantId: string;
  schemaVersion: number;
  rebuiltAt: Date | null;
  updatedAt: Date;
}): BusinessStateMetaSnapshot {
  return {
    tenantId: row.tenantId,
    schemaVersion: row.schemaVersion,
    rebuiltAt: row.rebuiltAt,
    updatedAt: row.updatedAt,
  };
}
