import "server-only";

import { prisma } from "@/lib/db";
import { businessDate } from "@/modules/shared-kernel/dates";
import type { HsnSacRecord, TaxRateRecord } from "@/modules/tax/domain/types";
import type {
  HsnSacRepository,
  TaxRateRepository,
} from "@/modules/tax/infrastructure/repositories";

function mapRate(row: {
  id: string;
  tenantId: string;
  name: string;
  rateBps: number;
  isDefault: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}): TaxRateRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    rateBps: row.rateBps,
    isDefault: row.isDefault,
    effectiveFrom: businessDate(row.effectiveFrom),
    effectiveTo: row.effectiveTo ? businessDate(row.effectiveTo) : null,
  };
}

function mapHsn(row: {
  id: string;
  tenantId: string;
  code: string;
  description: string;
  kind: string;
  taxRateBps: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}): HsnSacRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    description: row.description,
    kind: row.kind === "SAC" ? "SAC" : "HSN",
    taxRateBps: row.taxRateBps,
    effectiveFrom: businessDate(row.effectiveFrom),
    effectiveTo: row.effectiveTo ? businessDate(row.effectiveTo) : null,
  };
}

export const prismaTaxRateRepository: TaxRateRepository = {
  async listForTenant(tenantId) {
    const rows = await prisma.taxRate.findMany({ where: { tenantId } });
    return rows.map(mapRate);
  },
  async upsert(input) {
    const data = {
      tenantId: input.tenantId,
      name: input.name,
      rateBps: input.rateBps,
      isDefault: input.isDefault,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
    };
    const row = input.id
      ? await prisma.taxRate.update({ where: { id: input.id }, data })
      : await prisma.taxRate.create({ data });
    return mapRate(row);
  },
};

export const prismaHsnSacRepository: HsnSacRepository = {
  async listForTenant(tenantId) {
    const rows = await prisma.hsnSacCode.findMany({ where: { tenantId } });
    return rows.map(mapHsn);
  },
  async upsert(input) {
    const data = {
      tenantId: input.tenantId,
      code: input.code.trim().toUpperCase(),
      description: input.description,
      kind: input.kind,
      taxRateBps: input.taxRateBps,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
    };
    const row = input.id
      ? await prisma.hsnSacCode.update({ where: { id: input.id }, data })
      : await prisma.hsnSacCode.create({ data });
    return mapHsn(row);
  },
};
