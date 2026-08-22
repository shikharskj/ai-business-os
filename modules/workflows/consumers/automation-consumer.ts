import type { OutboxEventConsumer } from "@/modules/events/domain/types";
import { enqueueWorkflowRun } from "@/modules/workflows/application/enqueue-run";
import { listWorkflows } from "@/modules/workflows/application/registry";
import type { WorkflowRunRepository } from "@/modules/workflows/infrastructure/workflow-run-repository";

export const AUTOMATION_CONSUMER_NAME = "automation";

export type AutomationConsumerDeps = {
  runs: WorkflowRunRepository;
};

/**
 * Enqueues matching workflow runs from an outbox event. Execution happens
 * in `processDueWorkflowRuns` so a failed action can retry without
 * re-delivering the event or posting journals from this consumer.
 */
export function createAutomationOutboxConsumer(
  deps: AutomationConsumerDeps
): OutboxEventConsumer {
  return {
    name: AUTOMATION_CONSUMER_NAME,
    async handle(event) {
      const workflows = listWorkflows().filter((workflow) =>
        workflow.eventTypes.length === 0
          ? true
          : workflow.eventTypes.includes(event.eventType)
      );
      if (workflows.length === 0) {
        return { handled: false };
      }

      let enqueued = 0;
      for (const workflow of workflows) {
        const result = await enqueueWorkflowRun({
          workflow,
          event,
          runs: deps.runs,
        });
        if (result.run) {
          enqueued += 1;
        }
      }

      return { handled: enqueued > 0 };
    },
  };
}
