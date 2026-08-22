import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { toPrismaJson } from "@/modules/shared-kernel/json";
import type { TenantAutonomyPolicy } from "@/modules/tenant/domain/autonomy-policy";
import {
  sanitizeActionClasses,
  sanitizeAmountMap,
  type AutonomyPolicyRepository,
} from "@/modules/tenant/infrastructure/autonomy-policy-repository";

type PrismaPolicyClient = Pick<PrismaClient, "tenantAutonomyPolicy">;

function mapPolicy(record: {
  tenantId: string;
  allowedActionClasses: string[];
  amountThresholds: unknown;
  requireConfirmationAbove: unknown;
  disabledAutomations: string[];
}): TenantAutonomyPolicy {
  return {
    tenantId: record.tenantId,
    allowedActionClasses: sanitizeActionClasses(record.allowedActionClasses),
    amountThresholds: sanitizeAmountMap(record.amountThresholds),
    requireConfirmationAbove: sanitizeAmountMap(record.requireConfirmationAbove),
    disabledAutomations: [...record.disabledAutomations],
  };
}

export function createPrismaAutonomyPolicyRepository(
  client: PrismaPolicyClient
): AutonomyPolicyRepository {
  return {
    async findByTenantId(tenantId) {
      const record = await client.tenantAutonomyPolicy.findUnique({
        where: { tenantId },
      });
      return record ? mapPolicy(record) : null;
    },

    async upsert(tenantId, policy) {
      const record = await client.tenantAutonomyPolicy.upsert({
        where: { tenantId },
        create: {
          tenantId,
          allowedActionClasses: policy.allowedActionClasses,
          amountThresholds: toPrismaJson(
            policy.amountThresholds,
            "amountThresholds"
          ),
          requireConfirmationAbove: toPrismaJson(
            policy.requireConfirmationAbove,
            "requireConfirmationAbove"
          ),
          disabledAutomations: policy.disabledAutomations,
        },
        update: {
          allowedActionClasses: policy.allowedActionClasses,
          amountThresholds: toPrismaJson(
            policy.amountThresholds,
            "amountThresholds"
          ),
          requireConfirmationAbove: toPrismaJson(
            policy.requireConfirmationAbove,
            "requireConfirmationAbove"
          ),
          disabledAutomations: policy.disabledAutomations,
        },
      });
      return mapPolicy(record);
    },
  };
}

export const prismaAutonomyPolicyRepository =
  createPrismaAutonomyPolicyRepository(prisma);
