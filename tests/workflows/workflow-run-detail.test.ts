import { describe, expect, it } from "vitest";

import { getWorkflowRun } from "@/modules/workflows/application/get-workflow-run";
import { workflowRunHref } from "@/modules/workflows/application/run-view";
import { createMemoryWorkflowRunRepository } from "@/modules/workflows/infrastructure/memory-workflow-run-repository";
import type { WorkflowRun } from "@/modules/workflows/domain/types";

function sampleRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  const now = new Date("2026-08-22T10:00:00.000Z");
  return {
    id: "run-1",
    tenantId: "tenant-a",
    workflowId: "collections.remind",
    triggerEventId: "evt-1",
    triggerEventType: "InvoiceOverdue",
    aggregateType: "SalesInvoice",
    aggregateId: "inv-1",
    triggerPayload: {},
    idempotencyKey: "key-1",
    concurrencyKey: "concurrency-1",
    status: "SUCCEEDED",
    currentStep: "OUTCOME",
    attemptCount: 1,
    maxAttempts: 5,
    nextAttemptAt: now,
    lastError: null,
    result: { message: "Reminder sent" },
    outcomeKind: null,
    correlationId: null,
    createdAt: now,
    startedAt: now,
    completedAt: now,
    ...overrides,
  };
}

describe("workflowRunHref", () => {
  it("maps aggregate types to workspace routes", () => {
    expect(workflowRunHref("SalesInvoice", "inv-1")).toBe(
      "/app/sales/invoices/inv-1"
    );
    expect(workflowRunHref("Quotation", "qt-1")).toBe(
      "/app/sales/quotations/qt-1"
    );
    expect(workflowRunHref("Product", "prod-1")).toBe(
      "/app/inventory/products/prod-1"
    );
    expect(workflowRunHref("Expense", "exp-1")).toBe("/app/expenses/exp-1");
    expect(workflowRunHref("Unknown", "x")).toBeNull();
  });
});

describe("getWorkflowRun", () => {
  it("returns a run for the owning tenant only", async () => {
    const runs = createMemoryWorkflowRunRepository([
      sampleRun(),
      sampleRun({ id: "run-2", tenantId: "tenant-b" }),
    ]);

    const found = await getWorkflowRun({
      tenantId: "tenant-a",
      runId: "run-1",
      runs,
    });
    expect(found?.id).toBe("run-1");

    const missing = await getWorkflowRun({
      tenantId: "tenant-a",
      runId: "run-2",
      runs,
    });
    expect(missing).toBeNull();
  });
});
