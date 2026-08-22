import { PROOF_NOOP_WORKFLOW_ID } from "@/modules/workflows/domain/types";
import type { WorkflowDefinition } from "@/modules/workflows/domain/types";

/**
 * Dry-run proof that the runtime can complete EVENT → … → OUTCOME without
 * touching journals or stock. Collections (spec 10) registers separately.
 */
export function createNoopProofWorkflow(): WorkflowDefinition {
  return {
    id: PROOF_NOOP_WORKFLOW_ID,
    label: "Runtime check",
    eventTypes: ["AttentionDismissed"],
    autonomyLevel: "L0",
    mode: "dry_run",
    async condition() {
      return { match: true };
    },
    async reason() {
      return {
        summary:
          "No-op proof that the automation runtime can finish a run without posting.",
      };
    },
    async action() {
      return {
        executed: false,
        dryRun: true,
        message: "No domain action. Journals and stock were not touched.",
      };
    },
  };
}
