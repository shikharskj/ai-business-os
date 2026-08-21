import type { PrismaClient } from "@/generated/prisma/client";

import type {
  BusinessStateProjectionRepository,
  CommitBusinessStateSnapshotsInput,
} from "@/modules/business-state/domain/projection-repository";
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

type PrismaProjectionDelegateClient = Pick<
  PrismaClient,
  | "businessStateMeta"
  | "receivablesRiskState"
  | "inventoryRiskState"
  | "salesMomentumState"
>;

type PrismaProjectionClient = PrismaProjectionDelegateClient &
  Pick<PrismaClient, "$transaction">;

function shouldApplySnapshot(
  existingComputedAt: Date | undefined,
  incoming: Date
): boolean {
  return !existingComputedAt || existingComputedAt < incoming;
}

async function writeReceivablesRisk(
  client: PrismaProjectionDelegateClient,
  snapshot: ReceivablesRiskSnapshot
): Promise<boolean> {
  const existing = await client.receivablesRiskState.findUnique({
    where: { tenantId: snapshot.tenantId },
    select: { computedAt: true },
  });
  if (!shouldApplySnapshot(existing?.computedAt, snapshot.computedAt)) {
    return false;
  }
  await client.receivablesRiskState.upsert({
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
  return true;
}

async function writeInventoryRisk(
  client: PrismaProjectionDelegateClient,
  snapshot: InventoryRiskSnapshot
): Promise<boolean> {
  const existing = await client.inventoryRiskState.findUnique({
    where: { tenantId: snapshot.tenantId },
    select: { computedAt: true },
  });
  if (!shouldApplySnapshot(existing?.computedAt, snapshot.computedAt)) {
    return false;
  }
  await client.inventoryRiskState.upsert({
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
  return true;
}

async function writeSalesMomentum(
  client: PrismaProjectionDelegateClient,
  snapshot: SalesMomentumSnapshot
): Promise<boolean> {
  const existing = await client.salesMomentumState.findUnique({
    where: { tenantId: snapshot.tenantId },
    select: { computedAt: true },
  });
  if (!shouldApplySnapshot(existing?.computedAt, snapshot.computedAt)) {
    return false;
  }
  await client.salesMomentumState.upsert({
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
  return true;
}

async function writeMeta(
  client: PrismaProjectionDelegateClient,
  input: {
    tenantId: string;
    schemaVersion: number;
    rebuiltAt?: Date | null;
  }
): Promise<void> {
  await client.businessStateMeta.upsert({
    where: { tenantId: input.tenantId },
    create: {
      tenantId: input.tenantId,
      schemaVersion: input.schemaVersion,
      rebuiltAt: input.rebuiltAt ?? null,
    },
    update: {
      schemaVersion: input.schemaVersion,
      ...(input.rebuiltAt !== undefined ? { rebuiltAt: input.rebuiltAt } : {}),
    },
  });
}

async function commitSnapshotsInClient(
  client: PrismaProjectionDelegateClient,
  input: CommitBusinessStateSnapshotsInput
): Promise<{ appliedFamilies: number }> {
  let appliedFamilies = 0;

  if (input.receivablesRisk) {
    if (await writeReceivablesRisk(client, input.receivablesRisk)) {
      appliedFamilies += 1;
    }
  }
  if (input.inventoryRisk) {
    if (await writeInventoryRisk(client, input.inventoryRisk)) {
      appliedFamilies += 1;
    }
  }
  if (input.salesMomentum) {
    if (await writeSalesMomentum(client, input.salesMomentum)) {
      appliedFamilies += 1;
    }
  }

  if (appliedFamilies > 0 || input.rebuiltAt !== undefined) {
    await writeMeta(client, {
      tenantId: input.tenantId,
      schemaVersion: input.schemaVersion,
      rebuiltAt: input.rebuiltAt,
    });
  }

  return { appliedFamilies };
}

export function createPrismaBusinessStateProjectionRepository(
  prisma: PrismaProjectionClient
): BusinessStateProjectionRepository {
  return {
    async upsertReceivablesRisk(snapshot) {
      await writeReceivablesRisk(prisma, snapshot);
    },

    async upsertInventoryRisk(snapshot) {
      await writeInventoryRisk(prisma, snapshot);
    },

    async upsertSalesMomentum(snapshot) {
      await writeSalesMomentum(prisma, snapshot);
    },

    async touchMeta({ tenantId, schemaVersion, rebuiltAt }) {
      await writeMeta(prisma, { tenantId, schemaVersion, rebuiltAt });
    },

    async commitSnapshots(input) {
      return prisma.$transaction((tx) =>
        commitSnapshotsInClient(tx, input)
      );
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
    totalOutstanding: moneyFromPrismaDecimal(
      row.totalOutstanding,
      row.currency
    ),
    overdueOutstanding: moneyFromPrismaDecimal(
      row.overdueOutstanding,
      row.currency
    ),
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
    salesTotal: moneyFromPrismaDecimal(row.salesTotal, row.currency),
    taxableTotal: moneyFromPrismaDecimal(row.taxableTotal, row.currency),
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
