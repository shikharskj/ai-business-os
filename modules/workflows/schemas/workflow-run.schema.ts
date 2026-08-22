import { z } from "zod";
import {
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_STEPS,
} from "@/modules/workflows/domain/types";

export const workflowRunViewSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  label: z.string(),
  status: z.enum(WORKFLOW_RUN_STATUSES),
  currentStep: z.enum(WORKFLOW_STEPS),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  lastError: z.string().nullable(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  triggerEventType: z.string(),
  attemptCount: z.number(),
  relatedHref: z.string().nullable(),
  resultMessage: z.string().nullable(),
});

export type WorkflowRunView = z.infer<typeof workflowRunViewSchema>;
