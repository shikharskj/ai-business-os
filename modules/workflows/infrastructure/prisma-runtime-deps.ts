import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { createAiToolContextForActor } from "@/modules/ai/infrastructure/tool-context";
import { createPrismaAttentionQueueRepository } from "@/modules/business-state/infrastructure/prisma-attention-repository";
import { createPrismaOutboxRepository } from "@/modules/shared-kernel/outbox";
import { getAutonomyPolicy } from "@/modules/tenant/application/autonomy-policy";
import type { MembershipRole } from "@/modules/tenant/domain/types";
import { prismaAutonomyPolicyRepository } from "@/modules/tenant/infrastructure/prisma-autonomy-policy-repository";
import type { ExecuteWorkflowRunDeps } from "@/modules/workflows/application/runner";
import { createLogAutomationMetrics } from "@/modules/workflows/infrastructure/metrics";
import { createPrismaWorkflowRunRepository } from "@/modules/workflows/infrastructure/prisma-workflow-run-repository";

function asMembershipRole(value: string): MembershipRole | null {
  switch (value) {
    case "OWNER":
    case "ADMIN":
    case "STAFF":
    case "ACCOUNTANT":
      return value;
    default:
      return null;
  }
}

export function createPrismaAutomationRuntimeDeps(
  client: PrismaClient
): ExecuteWorkflowRunDeps {
  return {
    runs: createPrismaWorkflowRunRepository(client),
    attention: createPrismaAttentionQueueRepository(client),
    outbox: createPrismaOutboxRepository(client),
    metrics: createLogAutomationMetrics(),
    async resolveTenantContext(tenantId) {
      const business = await client.business.findUnique({
        where: { id: tenantId },
        select: { ownerUserId: true, currency: true, timezone: true },
      });
      if (!business) return null;
      const policy = await getAutonomyPolicy({
        tenantId,
        policies: prismaAutonomyPolicyRepository,
      });
      return {
        actorUserId: business.ownerUserId,
        currency: business.currency,
        timezone: business.timezone,
        policy,
      };
    },
    async resolveToolContext(tenantId) {
      const business = await client.business.findUnique({
        where: { id: tenantId },
        select: {
          ownerUserId: true,
          currency: true,
          timezone: true,
          lowStockThreshold: true,
        },
      });
      if (!business) return null;
      const membership = await client.membership.findUnique({
        where: {
          userId_tenantId: {
            userId: business.ownerUserId,
            tenantId,
          },
        },
        select: { role: true, status: true, userId: true },
      });
      if (!membership || membership.status !== "ACTIVE") return null;
      const role = asMembershipRole(membership.role);
      if (!role) return null;
      return createAiToolContextForActor({
        tenantId,
        actorUserId: membership.userId,
        role,
        timezone: business.timezone,
        currency: business.currency,
        lowStockThresholdMajor: business.lowStockThreshold.toString(),
      });
    },
  };
}
