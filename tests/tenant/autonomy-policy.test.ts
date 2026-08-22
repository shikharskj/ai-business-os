import { describe, expect, it } from "vitest";

import { createMemoryAuditRepository } from "@/modules/shared-kernel/audit";
import {
  AUTONOMY_POLICY_AUDIT_ACTION,
  AUTONOMY_POLICY_AUDIT_RESOURCE,
  getAutonomyPolicy,
  updateAutonomyPolicy,
} from "@/modules/tenant/application/autonomy-policy";
import {
  defaultAutonomyPolicy,
  evaluateL4Autonomy,
} from "@/modules/tenant/domain/autonomy-policy";
import { createMemoryAutonomyPolicyRepository } from "@/modules/tenant/infrastructure/autonomy-policy-repository";

const TENANT = "tenant-a";
const ACTOR = "user-owner";

describe("evaluateL4Autonomy", () => {
  const enabled = {
    ...defaultAutonomyPolicy(TENANT),
    allowedActionClasses: ["payment_reminder" as const],
    amountThresholds: { payment_reminder: "25000.00" },
  };

  it("rejects when the allow-list is empty (safe default)", () => {
    expect(
      evaluateL4Autonomy({
        actionClass: "payment_reminder",
        amountMajor: "1000.00",
        policy: defaultAutonomyPolicy(TENANT),
      })
    ).toEqual({ allowed: false, reason: "class_not_allowed" });
  });

  it("rejects unknown or posting classes", () => {
    expect(
      evaluateL4Autonomy({
        actionClass: "invoice_post",
        amountMajor: "100.00",
        policy: enabled,
      })
    ).toEqual({ allowed: false, reason: "class_not_allowed" });
  });

  it("allows a reminder at or under the threshold", () => {
    expect(
      evaluateL4Autonomy({
        actionClass: "payment_reminder",
        amountMajor: "25000.00",
        policy: enabled,
      })
    ).toEqual({ allowed: true, level: "L4" });
  });

  it("rejects over the amount threshold", () => {
    expect(
      evaluateL4Autonomy({
        actionClass: "payment_reminder",
        amountMajor: "25000.01",
        policy: enabled,
      })
    ).toEqual({ allowed: false, reason: "over_threshold" });
  });

  it("rejects when requireConfirmationAbove is lower than the amount", () => {
    expect(
      evaluateL4Autonomy({
        actionClass: "payment_reminder",
        amountMajor: "12000.00",
        policy: {
          ...enabled,
          requireConfirmationAbove: { payment_reminder: "10000.00" },
        },
      })
    ).toEqual({ allowed: false, reason: "confirmation_required" });
  });

  it("rejects a disabled automation id", () => {
    expect(
      evaluateL4Autonomy({
        actionClass: "payment_reminder",
        amountMajor: "500.00",
        automationId: "collections.reminder",
        policy: {
          ...enabled,
          disabledAutomations: ["collections.reminder"],
        },
      })
    ).toEqual({ allowed: false, reason: "automation_disabled" });
  });

  it("rejects a missing amount even when the class is allowed", () => {
    expect(
      evaluateL4Autonomy({
        actionClass: "payment_reminder",
        amountMajor: null,
        policy: enabled,
      })
    ).toEqual({ allowed: false, reason: "missing_amount" });
  });
});

describe("autonomy policy store", () => {
  it("returns the safe default when no row exists", async () => {
    const policies = createMemoryAutonomyPolicyRepository();
    const policy = await getAutonomyPolicy({ tenantId: TENANT, policies });
    expect(policy).toEqual(defaultAutonomyPolicy(TENANT));
  });

  it("persists L4 reminder enablement and audits the change", async () => {
    const policies = createMemoryAutonomyPolicyRepository();
    const audit = createMemoryAuditRepository();

    const next = await updateAutonomyPolicy({
      tenantId: TENANT,
      actorUserId: ACTOR,
      update: {
        enablePaymentReminderL4: true,
        paymentReminderAmountThreshold: "25000",
        paymentReminderRequireConfirmationAbove: "10000.5",
        disabledAutomations: [],
      },
      policies,
      audit,
    });

    expect(next.allowedActionClasses).toEqual(["payment_reminder"]);
    expect(next.amountThresholds.payment_reminder).toBe("25000.00");
    expect(next.requireConfirmationAbove.payment_reminder).toBe("10000.50");

    expect(audit.records).toHaveLength(1);
    expect(audit.records[0]).toMatchObject({
      tenantId: TENANT,
      actorUserId: ACTOR,
      action: AUTONOMY_POLICY_AUDIT_ACTION,
      resource: AUTONOMY_POLICY_AUDIT_RESOURCE,
      resourceId: TENANT,
    });
    expect(audit.records[0]?.metadata).toMatchObject({
      previous: { allowedActionClasses: [] },
      next: {
        allowedActionClasses: ["payment_reminder"],
        amountThresholds: { payment_reminder: "25000.00" },
      },
    });
  });

  it("refuses L4 enablement without a threshold", async () => {
    const policies = createMemoryAutonomyPolicyRepository();
    const audit = createMemoryAuditRepository();

    await expect(
      updateAutonomyPolicy({
        tenantId: TENANT,
        actorUserId: ACTOR,
        update: {
          enablePaymentReminderL4: true,
          paymentReminderAmountThreshold: "",
        },
        policies,
        audit,
      })
    ).rejects.toThrow();

    expect(audit.records).toHaveLength(0);
    expect(await policies.findByTenantId(TENANT)).toBeNull();
  });
});
