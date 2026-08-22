import type { AuditRepository } from "@/modules/shared-kernel/audit";
import {
  defaultAutonomyPolicy,
  type TenantAutonomyPolicy,
} from "@/modules/tenant/domain/autonomy-policy";
import type { AutonomyPolicyRepository } from "@/modules/tenant/infrastructure/autonomy-policy-repository";
import {
  autonomyPolicyUpdateSchema,
  type AutonomyPolicyUpdateInput,
} from "@/modules/tenant/schemas/autonomy-policy.schema";

export const AUTONOMY_POLICY_AUDIT_RESOURCE = "autonomy_policy";
export const AUTONOMY_POLICY_AUDIT_ACTION = "autonomy.policy.updated";

export async function getAutonomyPolicy(input: {
  tenantId: string;
  policies: AutonomyPolicyRepository;
}): Promise<TenantAutonomyPolicy> {
  const stored = await input.policies.findByTenantId(input.tenantId);
  return stored ?? defaultAutonomyPolicy(input.tenantId);
}

function policyAuditSnapshot(policy: TenantAutonomyPolicy) {
  return {
    allowedActionClasses: policy.allowedActionClasses,
    amountThresholds: policy.amountThresholds,
    requireConfirmationAbove: policy.requireConfirmationAbove,
    disabledAutomations: policy.disabledAutomations,
  };
}

export async function updateAutonomyPolicy(input: {
  tenantId: string;
  actorUserId: string;
  update: AutonomyPolicyUpdateInput;
  policies: AutonomyPolicyRepository;
  audit: AuditRepository;
  correlationId?: string;
}): Promise<TenantAutonomyPolicy> {
  const parsed = autonomyPolicyUpdateSchema.parse(input.update);
  const previous = await getAutonomyPolicy({
    tenantId: input.tenantId,
    policies: input.policies,
  });

  const next = await input.policies.upsert(input.tenantId, {
    ...parsed,
    disabledAutomations:
      parsed.disabledAutomations ?? previous.disabledAutomations,
  });

  await input.audit.append({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: AUTONOMY_POLICY_AUDIT_ACTION,
    resource: AUTONOMY_POLICY_AUDIT_RESOURCE,
    resourceId: input.tenantId,
    metadata: {
      previous: policyAuditSnapshot(previous),
      next: policyAuditSnapshot(next),
    },
    correlationId: input.correlationId,
  });

  return next;
}
