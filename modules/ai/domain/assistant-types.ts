import type { AiProviderName } from "@/lib/ai/types";
import type { AiToolName } from "@/modules/ai/domain/tool-types";

/**
 * A business fact shown to the user.
 *
 * Facts are built from schema-validated tool output by server code only
 * (`factsFromToolResult`). Model text can never become a fact, which is what
 * makes the "verified business data" section of the UI trustworthy rather than
 * merely labelled (project overview success criterion 18).
 */
export type AiAssistantFact = {
  id: string;
  label: string;
  value: string;
  detail: string | null;
  /** The tool the value came from — rendered as the citation. */
  sourceTool: AiToolName;
  href: string | null;
};

/** Contextual navigation chip. Never a mutation. */
export type AiAssistantSuggestion = {
  label: string;
  href: string;
};

/** One tool run that produced facts, with the audit record it wrote. */
export type AiAssistantSource = {
  toolName: AiToolName;
  auditRecordId: string;
};

/**
 * A mutation the model proposed but the server refused to run. It carries only
 * a preview; execution needs a separate confirmed request.
 */
export type AiAssistantPendingAction = {
  toolName: AiToolName;
  title: string;
  summary: string;
  /** What changes if the user confirms, stated plainly. */
  impact: string;
  fields: Array<{ label: string; value: string }>;
  /** Validated tool arguments. The route signs these before they leave. */
  argumentsJson: string;
};

/** Conversation history accepted from the client — never system or tool roles. */
export type AiAssistantTurn = {
  role: "user" | "assistant";
  content: string;
};

export type AiAssistantAnswer = {
  /** Model prose. Untrusted content — always rendered as AI analysis. */
  analysis: string;
  /** Model opinion, kept apart from facts. */
  recommendations: string[];
  facts: AiAssistantFact[];
  sources: AiAssistantSource[];
  suggestions: AiAssistantSuggestion[];
  pendingAction: AiAssistantPendingAction | null;
  /** True when at least one tool result backed the answer. */
  grounded: boolean;
  /** Model text quotes figures that no tool produced. */
  unverifiedFigures: boolean;
  /** Honest, user-facing notes about what could not be done. */
  notices: string[];
  provider: AiProviderName;
  model: string;
};

export type AiAssistantActionOutcome = {
  toolName: AiToolName;
  status: "executed";
  title: string;
  facts: AiAssistantFact[];
  auditRecordId: string;
};
