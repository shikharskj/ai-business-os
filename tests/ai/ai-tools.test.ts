import { describe, expect, it } from "vitest";

import {
  AI_TOOL_NAMES,
  AiToolAuthorizationError,
  AiToolIdentityOverrideError,
  AiToolInputError,
  AiToolNotFoundError,
  AiToolResourceNotFoundError,
} from "@/modules/ai";
import {
  AI_TOOL_AUDIT_ACTION,
  AI_TOOLS,
  executeAiTool,
  listAiToolSpecsForRole,
  listAiToolsForRole,
  runAiToolCall,
} from "@/modules/ai/server";
import {
  CUSTOMER_A,
  CUSTOMER_B,
  PERIOD,
  TENANT_A,
  TENANT_B,
  toolContext,
} from "./tool-context-fixture";

describe("ai tool registry (27)", () => {
  it("registers exactly the declared tools", () => {
    expect(AI_TOOLS.map((tool) => tool.name)).toEqual([...AI_TOOL_NAMES]);
  });

  it("never lets a read tool mutate or an action tool run unconfirmed", () => {
    for (const tool of AI_TOOLS) {
      expect(tool.requiresConfirmation, tool.name).toBe(
        tool.category === "action"
      );
    }

    expect(
      AI_TOOLS.filter((tool) => tool.category === "read").length
    ).toBeGreaterThan(0);
  });

  it("advertises provider-agnostic JSON Schema for the role's tools", () => {
    const specs = listAiToolSpecsForRole("OWNER");
    expect(specs).toHaveLength(AI_TOOLS.length);

    for (const spec of specs) {
      expect(spec.description.length).toBeGreaterThan(0);
      expect(spec.parameters).toMatchObject({
        type: "object",
        additionalProperties: false,
      });
      expect(JSON.stringify(spec).toLowerCase()).not.toContain("openai");
    }
  });
});

describe("ai tool tenant scoping (27)", () => {
  it("returns tenant-scoped sales for the authenticated owner and audits it", async () => {
    const context = toolContext();

    const result = await executeAiTool({
      context,
      toolName: "get_sales_summary",
      input: PERIOD,
    });

    expect(result.toolName).toBe("get_sales_summary");
    expect(result.output).toMatchObject({
      invoiceCount: 2,
      totalTaxable: { amountMajor: "5000.00", currency: "INR" },
      grandTotal: { amountMajor: "5900.00", currency: "INR" },
    });

    expect(context.auditRecords).toHaveLength(1);
    expect(context.auditRecords[0]).toMatchObject({
      tenantId: TENANT_A,
      actorUserId: "user-owner",
      action: AI_TOOL_AUDIT_ACTION,
      resourceId: "get_sales_summary",
      correlationId: "corr-1",
    });
    expect(context.auditRecords[0]?.metadata).toMatchObject({
      outcome: "success",
      permission: "report:read",
      role: "OWNER",
    });
  });

  it("never returns another tenant's records", async () => {
    const result = await executeAiTool({
      context: toolContext({ tenantId: TENANT_B }),
      toolName: "get_sales_summary",
      input: PERIOD,
    });

    expect(result.output).toMatchObject({
      invoiceCount: 1,
      totalTaxable: { amountMajor: "9999.00" },
    });
  });

  it("rejects a cross-tenant customer id and audits the failure", async () => {
    const context = toolContext();

    await expect(
      executeAiTool({
        context,
        toolName: "get_outstanding_receivables",
        input: { customerId: CUSTOMER_B, limit: 5 },
      })
    ).rejects.toBeInstanceOf(AiToolResourceNotFoundError);

    expect(context.auditRecords[0]?.metadata).toMatchObject({
      outcome: "failed",
      errorCode: "TOOL_RESOURCE_NOT_FOUND",
    });
  });

  it("groups receivables by customer, largest balance first", async () => {
    const result = await executeAiTool({
      context: toolContext(),
      toolName: "get_outstanding_receivables",
      input: { limit: 10 },
    });

    expect(result.output).toMatchObject({
      totalOutstanding: { amountMajor: "5900.00" },
      invoiceCount: 2,
      customerCount: 1,
      customers: [
        {
          customerId: CUSTOMER_A,
          customerName: "Acme Traders",
          invoiceCount: 2,
          outstanding: { amountMajor: "5900.00" },
          oldestDueOn: "2020-01-05",
        },
      ],
    });
  });

  it("reports overdue invoices with a positive overdue age", async () => {
    const result = await executeAiTool({
      context: toolContext(),
      toolName: "get_overdue_invoices",
      input: { limit: 10 },
    });

    const output = result.output as {
      invoiceCount: number;
      totalOverdue: { amountMajor: string };
      invoices: Array<{ invoiceNumber: string; daysOverdue: number }>;
    };

    expect(output.invoiceCount).toBe(2);
    expect(output.totalOverdue.amountMajor).toBe("5900.00");
    expect(output.invoices[0]?.invoiceNumber).toBe("INV/20-21/2");
    expect(output.invoices[0]?.daysOverdue).toBeGreaterThan(0);
  });

  it("summarises expenses by category, largest first", async () => {
    const result = await executeAiTool({
      context: toolContext(),
      toolName: "get_expenses_summary",
      input: PERIOD,
    });

    expect(result.output).toMatchObject({
      expenseCount: 2,
      total: { amountMajor: "1150.00" },
      byCategory: [
        { category: "TRAVEL", total: { amountMajor: "900.00" } },
        { category: "OFFICE", total: { amountMajor: "250.00" } },
      ],
    });
  });

  it("lists only this tenant's low-stock products", async () => {
    const result = await executeAiTool({
      context: toolContext(),
      toolName: "get_low_stock_products",
      input: { limit: 10 },
    });

    expect(result.output).toMatchObject({
      lowStockThresholdMajor: "5",
      trackedProductCount: 1,
      lowStockCount: 1,
      products: [{ productId: "prod-a1", name: "Basmati Rice", sku: "RICE-1" }],
    });
  });

  it("returns dashboard-consistent business metrics", async () => {
    const result = await executeAiTool({
      context: toolContext(),
      toolName: "get_business_metrics",
      input: PERIOD,
    });

    expect(result.output).toMatchObject({
      revenue: { amountMajor: "5000.00" },
      expenses: { amountMajor: "1150.00" },
      profit: { amountMajor: "3850.00" },
      receivables: { amountMajor: "5900.00" },
      lowStockCount: 1,
    });
  });
});

describe("ai tool authorization (27)", () => {
  it("offers a role only the tools its permissions allow", () => {
    const staffTools = listAiToolsForRole("STAFF").map((tool) => tool.name);
    expect(staffTools).toContain("get_overdue_invoices");
    expect(staffTools).toContain("get_low_stock_products");
    expect(staffTools).not.toContain("get_sales_summary");
    expect(staffTools).not.toContain("get_cash_position");
    expect(staffTools).not.toContain("explain_period_movement");

    const accountantTools = listAiToolsForRole("ACCOUNTANT").map(
      (tool) => tool.name
    );
    expect(accountantTools).toContain("get_sales_summary");
    expect(accountantTools).toContain("get_cash_position");
    expect(accountantTools).toContain("explain_period_movement");
    expect(accountantTools).not.toContain("send_payment_reminders");
  });

  it("refuses a tool the role lacks permission for and audits the denial", async () => {
    const context = toolContext({ role: "STAFF" });

    await expect(
      executeAiTool({
        context,
        toolName: "get_sales_summary",
        input: PERIOD,
      })
    ).rejects.toBeInstanceOf(AiToolAuthorizationError);

    expect(context.auditRecords[0]?.metadata).toMatchObject({
      outcome: "denied",
      errorCode: "TOOL_FORBIDDEN",
      permission: "report:read",
      role: "STAFF",
    });
  });

  it("cannot run without authenticated identity and tenant context", async () => {
    const unauthenticated = { ...toolContext(), tenantId: "", actorUserId: "" };

    await expect(
      executeAiTool({
        context: unauthenticated,
        toolName: "get_business_metrics",
        input: PERIOD,
      })
    ).rejects.toMatchObject({
      name: "AiToolError",
      code: "TOOL_CONTEXT_INVALID",
    });

    expect(unauthenticated.auditRecords).toHaveLength(1);
    expect(unauthenticated.auditRecords[0]).toMatchObject({
      action: AI_TOOL_AUDIT_ACTION,
      metadata: expect.objectContaining({
        outcome: "failed",
        errorCode: "TOOL_CONTEXT_INVALID",
      }),
    });
  });

  it("refuses model-supplied identity and tenant fields", async () => {
    const context = toolContext();

    await expect(
      executeAiTool({
        context,
        toolName: "get_sales_summary",
        input: { ...PERIOD, tenantId: TENANT_B },
      })
    ).rejects.toBeInstanceOf(AiToolIdentityOverrideError);

    await expect(
      executeAiTool({
        context,
        toolName: "get_low_stock_products",
        input: { limit: 5, role: "OWNER" },
      })
    ).rejects.toBeInstanceOf(AiToolIdentityOverrideError);

    expect(
      context.auditRecords.every(
        (record) =>
          (record.metadata as { errorCode?: string }).errorCode ===
          "TOOL_IDENTITY_OVERRIDE"
      )
    ).toBe(true);
  });

  it("rejects unknown tools and invalid input", async () => {
    const context = toolContext();

    await expect(
      executeAiTool({
        context,
        toolName: "run_sql",
        input: {},
      })
    ).rejects.toBeInstanceOf(AiToolNotFoundError);

    await expect(
      executeAiTool({
        context,
        toolName: "get_overdue_invoices",
        input: { limit: 500 },
      })
    ).rejects.toBeInstanceOf(AiToolInputError);

    await expect(
      executeAiTool({
        context,
        toolName: "get_sales_summary",
        input: { preset: "custom", fromDate: "2020-03-31", toDate: "2020-03-01" },
      })
    ).rejects.toBeInstanceOf(AiToolInputError);
  });

  it("returns tool failures as data for the assistant loop", async () => {
    const context = toolContext();

    const failure = await runAiToolCall({
      context,
      toolName: "get_sales_summary",
      argumentsJson: "not json",
    });

    expect(failure).toMatchObject({ ok: false, code: "TOOL_INPUT_INVALID" });
    expect(context.auditRecords[0]?.metadata).toMatchObject({
      outcome: "failed",
    });

    const success = await runAiToolCall({
      context,
      toolName: "get_low_stock_products",
      argumentsJson: JSON.stringify({ limit: 3 }),
    });
    expect(success.ok).toBe(true);
  });
});
