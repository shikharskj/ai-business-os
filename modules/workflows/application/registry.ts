import type { WorkflowDefinition } from "@/modules/workflows/domain/types";

const workflows = new Map<string, WorkflowDefinition>();

export function registerWorkflow(workflow: WorkflowDefinition): void {
  if (!workflow.id.trim()) {
    throw new Error("Workflow id is required");
  }
  workflows.set(workflow.id, workflow);
}

export function unregisterWorkflow(id: string): void {
  workflows.delete(id);
}

export function clearWorkflows(): void {
  workflows.clear();
}

export function listWorkflows(): WorkflowDefinition[] {
  return [...workflows.values()];
}

export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return workflows.get(id);
}
