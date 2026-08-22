import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { AutomationOutcomeKind } from "@/modules/business-state/domain/types";
import { AUTOMATION_OUTCOME_KINDS } from "@/modules/business-state/domain/types";
import { toPrismaJson } from "@/modules/shared-kernel/json";
import {
  WORKFLOW_MAX_ATTEMPTS,
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_STEPS,
  type WorkflowRun,
  type WorkflowRunStatus,
  type WorkflowStep,
} from "@/modules/workflows/domain/types";
import type { WorkflowRunRepository } from "@/modules/workflows/infrastructure/workflow-run-repository";

type PrismaWorkflowClient = Pick<PrismaClient, "workflowRun">;

const STATUS_SET = new Set<string>(WORKFLOW_RUN_STATUSES);
const STEP_SET = new Set<string>(WORKFLOW_STEPS);
const OUTCOME_SET = new Set<string>(AUTOMATION_OUTCOME_KINDS);

function payloadRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function mapStatus(value: string): WorkflowRunStatus {
  if (!STATUS_SET.has(value)) {
    throw new Error(`Unknown workflow run status: ${value}`);
  }
  return value as WorkflowRunStatus;
}

function mapStep(value: string): WorkflowStep {
  if (!STEP_SET.has(value)) {
    throw new Error(`Unknown workflow step: ${value}`);
  }
  return value as WorkflowStep;
}

function mapOutcomeKind(value: string | null): AutomationOutcomeKind | null {
  if (value === null) return null;
  if (!OUTCOME_SET.has(value)) {
    throw new Error(`Unknown automation outcome kind: ${value}`);
  }
  return value as AutomationOutcomeKind;
}

function mapRun(row: {
  id: string;
  tenantId: string;
  workflowId: string;
  triggerEventId: string;
  triggerEventType: string;
  aggregateType: string;
  aggregateId: string;
  triggerPayload: unknown;
  idempotencyKey: string;
  concurrencyKey: string;
  status: string;
  currentStep: string;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  result: unknown;
  outcomeKind: string | null;
  correlationId: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}): WorkflowRun {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workflowId: row.workflowId,
    triggerEventId: row.triggerEventId,
    triggerEventType: row.triggerEventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    triggerPayload: payloadRecord(row.triggerPayload),
    idempotencyKey: row.idempotencyKey,
    concurrencyKey: row.concurrencyKey,
    status: mapStatus(row.status),
    currentStep: mapStep(row.currentStep),
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    nextAttemptAt: row.nextAttemptAt,
    lastError: row.lastError,
    result: payloadRecord(row.result),
    outcomeKind: mapOutcomeKind(row.outcomeKind),
    correlationId: row.correlationId,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

export function createPrismaWorkflowRunRepository(
  client: PrismaWorkflowClient
): WorkflowRunRepository {
  return {
    async createIfAbsent(input) {
      const existing = await client.workflowRun.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) {
        return { created: false, run: mapRun(existing) };
      }

      try {
        const created = await client.workflowRun.create({
          data: {
            tenantId: input.tenantId,
            workflowId: input.workflowId,
            triggerEventId: input.triggerEventId,
            triggerEventType: input.triggerEventType,
            aggregateType: input.aggregateType,
            aggregateId: input.aggregateId,
            triggerPayload: toPrismaJson(input.triggerPayload, "triggerPayload"),
            idempotencyKey: input.idempotencyKey,
            concurrencyKey: input.concurrencyKey,
            status: "PENDING",
            currentStep: "EVENT",
            attemptCount: 0,
            maxAttempts: WORKFLOW_MAX_ATTEMPTS,
            correlationId: input.correlationId ?? null,
          },
        });
        return { created: true, run: mapRun(created) };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "";
        if (code !== "P2002") throw error;
        const raced = await client.workflowRun.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: input.tenantId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (!raced) throw error;
        return { created: false, run: mapRun(raced) };
      }
    },

    async findByIdempotencyKey(tenantId, idempotencyKey) {
      const row = await client.workflowRun.findUnique({
        where: {
          tenantId_idempotencyKey: { tenantId, idempotencyKey },
        },
      });
      return row ? mapRun(row) : null;
    },

    async claimDue(input) {
      const take = Math.min(Math.max(input.limit, 1), 100);
      const due = await client.workflowRun.findMany({
        where: {
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          status: { in: ["PENDING", "RETRY"] },
          nextAttemptAt: { lte: input.now },
        },
        orderBy: { createdAt: "asc" },
        take: take * 2,
      });

      const claimed: WorkflowRun[] = [];
      for (const row of due) {
        if (claimed.length >= take) break;

        const running = await client.workflowRun.count({
          where: {
            tenantId: row.tenantId,
            concurrencyKey: row.concurrencyKey,
            status: "RUNNING",
            id: { not: row.id },
          },
        });
        if (running > 0) continue;

        const updated = await client.workflowRun.updateMany({
          where: {
            id: row.id,
            tenantId: row.tenantId,
            status: { in: ["PENDING", "RETRY"] },
          },
          data: {
            status: "RUNNING",
            attemptCount: { increment: 1 },
            startedAt: input.now,
          },
        });
        if (updated.count !== 1) continue;

        const locked = await client.workflowRun.findUnique({
          where: { id: row.id },
        });
        if (locked) {
          claimed.push(mapRun(locked));
        }
      }

      return claimed;
    },

    async update(id, tenantId, patch) {
      const updated = await client.workflowRun.updateMany({
        where: { id, tenantId },
        data: {
          status: patch.status,
          currentStep: patch.currentStep,
          ...(patch.nextAttemptAt !== undefined
            ? { nextAttemptAt: patch.nextAttemptAt }
            : {}),
          ...(patch.lastError !== undefined ? { lastError: patch.lastError } : {}),
          ...(patch.result !== undefined
            ? { result: toPrismaJson(patch.result, "result") }
            : {}),
          ...(patch.outcomeKind !== undefined
            ? { outcomeKind: patch.outcomeKind }
            : {}),
          ...(patch.completedAt !== undefined
            ? { completedAt: patch.completedAt }
            : {}),
        },
      });
      if (updated.count !== 1) {
        throw new Error(`Workflow run ${id} was not found for tenant ${tenantId}`);
      }
      const row = await client.workflowRun.findUnique({ where: { id } });
      if (!row) {
        throw new Error(`Workflow run ${id} was not found for tenant ${tenantId}`);
      }
      return mapRun(row);
    },

    async listRecent(tenantId, limit) {
      const rows = await client.workflowRun.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(limit, 1), 50),
      });
      return rows.map(mapRun);
    },
  };
}

export const prismaWorkflowRunRepository =
  createPrismaWorkflowRunRepository(prisma);
