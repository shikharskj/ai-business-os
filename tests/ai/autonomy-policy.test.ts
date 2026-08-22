import { describe, expect, it } from "vitest";

import { AiAutonomyPolicyError } from "@/modules/ai";
import { runConfirmedAiAction } from "@/modules/ai/application/confirm-action";
import { executeAiTool } from "@/modules/ai/application/execute-tool";
import { AI_TOOLS } from "@/modules/ai/application/tools/registry";
import { defaultAutonomyPolicy } from "@/modules/tenant/domain/autonomy-policy";
import { toolContext } from "./tool-context-fixture";

function withReminderL4(
  thresholdMajor = "25000.00",
  extras?: {
    requireConfirmationAbove?: string;
    disabledAutomations?: string[];
  }
) {
  const context = toolContext();
  context.autonomyPolicy = {
    ...defaultAutonomyPolicy(context.tenantId),
    allowedActionClasses: ["payment_reminder"],
    amountThresholds: { payment_reminder: thresholdMajor },
    requireConfirmationAbove: extras?.requireConfirmationAbove
      ? { payment_reminder: extras.requireConfirmationAbove }
      : {},
    disabledAutomations: extras?.disabledAutomations ?? [],
  };
  return context;
}

describe("tool autonomy metadata (08)", () => {
  it("declares L0 on read tools and L3 + payment_reminder on send_payment_reminders", () => {
    for (const tool of AI_TOOLS) {
      if (tool.category === "read") {
        expect(tool.autonomyLevel, tool.name).toBe("L0");
        expect(tool.actionClass, tool.name).toBeUndefined();
      }
    }

    const reminders = AI_TOOLS.find(
      (tool) => tool.name === "send_payment_reminders"
    );
    expect(reminders).toMatchObject({
      category: "action",
      autonomyLevel: "L3",
      actionClass: "payment_reminder",
      requiresConfirmation: true,
    });
  });
});

describe("L4 policy gate on executeAiTool (08)", () => {
  it("rejects L4 when policy is disabled (safe default)", async () => {
    const context = toolContext();

    await expect(
      executeAiTool({
        context,
        toolName: "send_payment_reminders",
        input: { invoiceIds: ["inv-a1"] },
        autonomyAttempt: "L4",
        policyAmountMajor: "1180.00",
      })
    ).rejects.toBeInstanceOf(AiAutonomyPolicyError);

    expect(context.notificationRecords).toHaveLength(0);
    expect(context.auditRecords[0]?.metadata).toMatchObject({
      outcome: "failed",
      errorCode: "TOOL_AUTONOMY_DENIED",
      autonomyDeniedReason: "class_not_allowed",
      autonomyLevel: "L3",
    });
  });

  it("rejects L4 when the amount is over the threshold", async () => {
    const context = withReminderL4("1000.00");

    await expect(
      executeAiTool({
        context,
        toolName: "send_payment_reminders",
        input: { invoiceIds: ["inv-a1"] },
        autonomyAttempt: "L4",
        policyAmountMajor: "1180.00",
      })
    ).rejects.toMatchObject({
      name: "AiAutonomyPolicyError",
      code: "TOOL_AUTONOMY_DENIED",
      reason: "over_threshold",
    });

    expect(context.notificationRecords).toHaveLength(0);
  });

  it("sends a reminder at L4 when policy enables the class under the threshold", async () => {
    const context = withReminderL4("25000.00");

    const result = await executeAiTool({
      context,
      toolName: "send_payment_reminders",
      input: { invoiceIds: ["inv-a1"] },
      autonomyAttempt: "L4",
      policyAmountMajor: "1180.00",
    });

    expect(result.output).toMatchObject({
      sentCount: 1,
      failedCount: 0,
    });
    expect(context.notificationRecords).toHaveLength(1);
  });

  it("leaves the L3 confirm path unchanged when policy is off", async () => {
    const context = toolContext();

    await expect(
      executeAiTool({
        context,
        toolName: "send_payment_reminders",
        input: { invoiceIds: ["inv-a1"] },
      })
    ).rejects.toMatchObject({ code: "TOOL_CONFIRMATION_REQUIRED" });

    const outcome = await runConfirmedAiAction({
      context,
      toolName: "send_payment_reminders",
      argumentsJson: JSON.stringify({ invoiceIds: ["inv-a1"] }),
    });

    expect(outcome.status).toBe("executed");
    expect(context.notificationRecords).toHaveLength(1);
  });
});
