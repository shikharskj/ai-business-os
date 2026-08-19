import type { BusinessDate } from "@/modules/shared-kernel/dates";
import type { HsnSacRecord, TaxRateRecord } from "@/modules/tax/domain/types";

export type TaxRateRepository = {
  listForTenant(tenantId: string): Promise<TaxRateRecord[]>;
  upsert(input: Omit<TaxRateRecord, "id"> & { id?: string }): Promise<TaxRateRecord>;
};

export type HsnSacRepository = {
  listForTenant(tenantId: string): Promise<HsnSacRecord[]>;
  upsert(input: Omit<HsnSacRecord, "id"> & { id?: string }): Promise<HsnSacRecord>;
};

function isEffectiveOn(
  from: BusinessDate,
  to: BusinessDate | null,
  on: BusinessDate
): boolean {
  if (on < from) {
    return false;
  }
  if (to && on > to) {
    return false;
  }
  return true;
}

export function selectEffectiveRate(
  rates: TaxRateRecord[],
  on: BusinessDate
): TaxRateRecord | null {
  const effective = rates
    .filter((rate) => isEffectiveOn(rate.effectiveFrom, rate.effectiveTo, on))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return effective.find((rate) => rate.isDefault) ?? effective[0] ?? null;
}

export function selectEffectiveHsn(
  codes: HsnSacRecord[],
  hsnSac: string,
  on: BusinessDate
): HsnSacRecord | null {
  const normalized = hsnSac.trim().toUpperCase();
  const effective = codes
    .filter(
      (row) =>
        row.code.toUpperCase() === normalized &&
        isEffectiveOn(row.effectiveFrom, row.effectiveTo, on)
    )
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return effective[0] ?? null;
}

export function createMemoryTaxRateRepository(): TaxRateRepository & {
  records: TaxRateRecord[];
} {
  const records: TaxRateRecord[] = [];
  return {
    records,
    async listForTenant(tenantId) {
      return records.filter((row) => row.tenantId === tenantId);
    },
    async upsert(input) {
      const record: TaxRateRecord = {
        ...input,
        id: input.id ?? crypto.randomUUID(),
      };
      const index = records.findIndex((row) => row.id === record.id);
      if (index >= 0) {
        records[index] = record;
      } else {
        records.push(record);
      }
      return record;
    },
  };
}

export function createMemoryHsnSacRepository(): HsnSacRepository & {
  records: HsnSacRecord[];
} {
  const records: HsnSacRecord[] = [];
  return {
    records,
    async listForTenant(tenantId) {
      return records.filter((row) => row.tenantId === tenantId);
    },
    async upsert(input) {
      const record: HsnSacRecord = {
        ...input,
        id: input.id ?? crypto.randomUUID(),
        code: input.code.trim().toUpperCase(),
      };
      const index = records.findIndex((row) => row.id === record.id);
      if (index >= 0) {
        records[index] = record;
      } else {
        records.push(record);
      }
      return record;
    },
  };
}
