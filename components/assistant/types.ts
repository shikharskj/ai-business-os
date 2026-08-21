import type {
  AiAssistantActionOutcome,
  AiAssistantFact,
  AiAssistantPendingAction,
  AiAssistantSource,
  AiAssistantSuggestion,
} from "@/modules/ai/domain/assistant-types";

export type AssistantPendingActionWire = AiAssistantPendingAction & {
  token: string;
};

export type AssistantMetaData = {
  provider: string;
  model: string;
  facts: AiAssistantFact[];
  sources: AiAssistantSource[];
  suggestions: AiAssistantSuggestion[];
  pendingAction: AssistantPendingActionWire | null;
  notices: string[];
  grounded: boolean;
};

export type AssistantActionState =
  | { status: "proposed" }
  | { status: "running" }
  | { status: "executed"; outcome: AiAssistantActionOutcome }
  | { status: "cancelled" }
  | { status: "failed"; message: string };

export type AssistantErrorBody = {
  error?: { code?: string; message?: string };
};
