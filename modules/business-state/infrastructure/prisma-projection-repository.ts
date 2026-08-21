import type { PrismaClient } from "@/generated/prisma/client";

import type {
  BusinessStateProjectionRepository,
  CommitBusinessStateSnapshotsInput,
} from "@/modules/business-state/domain/projection-repository";
import type {
  BusinessStateMetaSnapshot,
  CashPositionSnapshot,
  InventoryRiskSnapshot,
  ReceivablesRiskSnapshot,
  SalesMomentumSnapshot,
} from "@/modules/business-state/domain/types";
import {
  CASH_POSITION_ACCOUNT_CODES,
  cashPositionAccountName,
} from "@/modules/accounting/domain/cash-accounts";
import { ACCOUNT_CODES } from "@/modules/accounting/domain/types";
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
  | "cashPositionState"
>;

type PrismaProjectionClient = PrismaProjectionDelegateClient &
  Pick<PrismaClient, "$transaction">;

/**
 * Apply a snapshot only when missing or stored.computedAt is older.
 * The computedAt predicate lives in the UPDATE so a concurrent write cannot
 * overwrite newer state after a stale read.
 *
 * Insert must be ON CONFLICT DO NOTHING (`createMany` + `skipDuplicates`),
 * not `create` + catch P2002. A unique violation inside a PostgreSQL
 * interactive `$transaction` aborts the transaction (25P02), so the retry
 * update, later family writes, and `writeMeta` cannot commit.
 */
async function insertOrUpdateIfNewer(input: {
  updateNewer: () => Promise<{ count: number }>;
  insertIfAbsent: () => Promise<{ count: number }>;
}): Promise<boolean> {
  const updated = await input.updateNewer();
  if (updated.count > 0) {
    return true;
  }
  const inserted = await input.insertIfAbsent();
  if (inserted.count > 0) {
    return true;
  }
  const retried = await input.updateNewer();
  return retried.count > 0;
}

async function writeReceivablesRisk(
  client: PrismaProjectionDelegateClient,
  snapshot: ReceivablesRiskSnapshot
): Promise<boolean> {
  const values = {
    openInvoiceCount: snapshot.openInvoiceCount,
    overdueInvoiceCount: snapshot.overdueInvoiceCount,
    totalOutstanding: toDecimalForPrisma(snapshot.totalOutstanding),
    overdueOutstanding: toDecimalForPrisma(snapshot.overdueOutstanding),
    currency: snapshot.currency,
    computedAt: snapshot.computedAt,
  };
  return insertOrUpdateIfNewer({
    updateNewer: () =>
      client.receivablesRiskState.updateMany({
        where: {
          tenantId: snapshot.tenantId,
          computedAt: { lt: snapshot.computedAt },
        },
        data: values,
      }),
    insertIfAbsent: () =>
      client.receivablesRiskState.createMany({
        data: { tenantId: snapshot.tenantId, ...values },
        skipDuplicates: true,
      }),
  });
}

async function writeInventoryRisk(
  client: PrismaProjectionDelegateClient,
  snapshot: InventoryRiskSnapshot
): Promise<boolean> {
  const values = {
    lowStockCount: snapshot.lowStockCount,
    thresholdMajor: snapshot.thresholdMajor,
    computedAt: snapshot.computedAt,
  };
  return insertOrUpdateIfNewer({
    updateNewer: () =>
      client.inventoryRiskState.updateMany({
        where: {
          tenantId: snapshot.tenantId,
          computedAt: { lt: snapshot.computedAt },
        },
        data: values,
      }),
    insertIfAbsent: () =>
      client.inventoryRiskState.createMany({
        data: { tenantId: snapshot.tenantId, ...values },
        skipDuplicates: true,
      }),
  });
}

async function writeSalesMomentum(
  client: PrismaProjectionDelegateClient,
  snapshot: SalesMomentumSnapshot
): Promise<boolean> {
  const values = {
    windowDays: snapshot.windowDays,
    windowFrom: snapshot.windowFrom,
    windowTo: snapshot.windowTo,
    postedInvoiceCount: snapshot.postedInvoiceCount,
    salesTotal: toDecimalForPrisma(snapshot.salesTotal),
    taxableTotal: toDecimalForPrisma(snapshot.taxableTotal),
    currency: snapshot.currency,
    computedAt: snapshot.computedAt,
  };
  return insertOrUpdateIfNewer({
    updateNewer: () =>
      client.salesMomentumState.updateMany({
        where: {
          tenantId: snapshot.tenantId,
          computedAt: { lt: snapshot.computedAt },
        },
        data: values,
      }),
    insertIfAbsent: () =>
      client.salesMomentumState.createMany({
        data: { tenantId: snapshot.tenantId, ...values },
        skipDuplicates: true,
      }),
  });
}

function storedCashAccountName(
  snapshot: CashPositionSnapshot,
  code: string
): string {
  return cashPositionAccountName(
    code,
    snapshot.accounts.find((account) => account.accountCode === code)
      ?.accountName
  );
}

async function writeCashPosition(
  client: PrismaProjectionDelegateClient,
  snapshot: CashPositionSnapshot
): Promise<boolean> {
  const values = {
    cashBalance: toDecimalForPrisma(snapshot.cashBalance),
    bankBalance: toDecimalForPrisma(snapshot.bankBalance),
    total: toDecimalForPrisma(snapshot.total),
    currency: snapshot.currency,
    scale: snapshot.scale,
    cashAccountName: storedCashAccountName(snapshot, ACCOUNT_CODES.CASH),
    bankAccountName: storedCashAccountName(snapshot, ACCOUNT_CODES.BANK),
    computedAt: snapshot.computedAt,
  };
  return insertOrUpdateIfNewer({
    updateNewer: () =>
      client.cashPositionState.updateMany({
        where: {
          tenantId: snapshot.tenantId,
          computedAt: { lt: snapshot.computedAt },
        },
        data: values,
      }),
    insertIfAbsent: () =>
      client.cashPositionState.createMany({
        data: { tenantId: snapshot.tenantId, ...values },
        skipDuplicates: true,
      }),
  });
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
  if (input.cashPosition) {
    if (await writeCashPosition(client, input.cashPosition)) {
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

    async upsertCashPosition(snapshot) {
      await writeCashPosition(prisma, snapshot);
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

    async getCashPosition(tenantId) {
      const row = await prisma.cashPositionState.findUnique({
        where: { tenantId },
      });
      return row ? mapCashPosition(row) : null;
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

function mapCashPosition(row: {
  tenantId: string;
  cashBalance: { toString(): string };
  bankBalance: { toString(): string };
  total: { toString(): string };
  currency: string;
  scale: number;
  cashAccountName: string;
  bankAccountName: string;
  computedAt: Date;
}): CashPositionSnapshot {
  const cashBalance = moneyFromPrismaDecimal(
    row.cashBalance,
    row.currency,
    row.scale
  );
  const bankBalance = moneyFromPrismaDecimal(
    row.bankBalance,
    row.currency,
    row.scale
  );
  const total = moneyFromPrismaDecimal(row.total, row.currency, row.scale);

  return {
    tenantId: row.tenantId,
    cashBalance,
    bankBalance,
    total,
    currency: row.currency,
    scale: row.scale,
    accounts: CASH_POSITION_ACCOUNT_CODES.map((code) => ({
      accountCode: code,
      accountName: cashPositionAccountName(
        code,
        code === ACCOUNT_CODES.CASH ? row.cashAccountName : row.bankAccountName
      ),
      balance: code === ACCOUNT_CODES.CASH ? cashBalance : bankBalance,
      factId: `cash-position:account:${code}`,
    })),
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
