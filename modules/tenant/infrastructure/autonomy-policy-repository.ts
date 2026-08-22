import {
  isAutonomyActionClass,
  type AutonomyActionClass,
  type TenantAutonomyPolicy,
} from "@/modules/tenant/domain/autonomy-policy";

export type AutonomyPolicyWrite = Omit<TenantAutonomyPolicy, "tenantId">;

export type AutonomyPolicyRepository = {
  findByTenantId(tenantId: string): Promise<TenantAutonomyPolicy | null>;
  upsert(
    tenantId: string,
    policy: AutonomyPolicyWrite
  ): Promise<TenantAutonomyPolicy>;
};

function clonePolicy(policy: TenantAutonomyPolicy): TenantAutonomyPolicy {
  return {
    tenantId: policy.tenantId,
    allowedActionClasses: [...policy.allowedActionClasses],
    amountThresholds: { ...policy.amountThresholds },
    requireConfirmationAbove: { ...policy.requireConfirmationAbove },
    disabledAutomations: [...policy.disabledAutomations],
  };
}

export function sanitizeAmountMap(
  value: unknown
): Partial<Record<AutonomyActionClass, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Partial<Record<AutonomyActionClass, string>> = {};
  for (const [key, amount] of Object.entries(value)) {
    if (isAutonomyActionClass(key) && typeof amount === "string" && amount) {
      result[key] = amount;
    }
  }
  return result;
}

export function sanitizeActionClasses(values: string[]): AutonomyActionClass[] {
  const unique: AutonomyActionClass[] = [];
  for (const value of values) {
    if (isAutonomyActionClass(value) && !unique.includes(value)) {
      unique.push(value);
    }
  }
  return unique;
}

export function createMemoryAutonomyPolicyRepository(
  initial: TenantAutonomyPolicy[] = []
): AutonomyPolicyRepository & { records: Map<string, TenantAutonomyPolicy> } {
  const records = new Map<string, TenantAutonomyPolicy>(
    initial.map((policy) => [policy.tenantId, clonePolicy(policy)])
  );

  return {
    records,
    async findByTenantId(tenantId) {
      const existing = records.get(tenantId);
      return existing ? clonePolicy(existing) : null;
    },
    async upsert(tenantId, policy) {
      const stored: TenantAutonomyPolicy = {
        tenantId,
        allowedActionClasses: [...policy.allowedActionClasses],
        amountThresholds: { ...policy.amountThresholds },
        requireConfirmationAbove: { ...policy.requireConfirmationAbove },
        disabledAutomations: [...policy.disabledAutomations],
      };
      records.set(tenantId, stored);
      return clonePolicy(stored);
    },
  };
}
