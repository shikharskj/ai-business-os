"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SendHorizonal } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type SubmitEvent,
} from "react";

import { activityStepsFromParts } from "@/components/assistant/assistant-activity";
import {
  AssistantMessageView,
  UserBubble,
} from "@/components/assistant/assistant-answer-view";
import { AssistantWelcome } from "@/components/assistant/assistant-welcome";
import type {
  AssistantActionState,
  AssistantErrorBody,
  AssistantMetaData,
  AssistantPendingActionWire,
} from "@/components/assistant/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AiAssistantActionOutcome } from "@/modules/ai/domain/assistant-types";

const STARTERS = [
  "Who owes me money?",
  "Why did profit change this month?",
  "What should I focus on today?",
  "What is low in stock?",
] as const;

type ConfirmErrorBody = { error?: { message?: string; code?: string } };

function emptyMeta(): AssistantMetaData {
  return {
    provider: "stub",
    model: "unavailable",
    facts: [],
    sources: [],
    suggestions: [],
    pendingAction: null,
    notices: [],
    grounded: false,
  };
}

function messageText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("");
}

function metaFromParts(
  parts: Array<{ type: string; data?: unknown }>,
): AssistantMetaData {
  const metaPart = parts.find((part) => part.type === "data-assistant-meta");
  if (!metaPart || !metaPart.data || typeof metaPart.data !== "object") {
    return emptyMeta();
  }
  return { ...emptyMeta(), ...(metaPart.data as AssistantMetaData) };
}

/**
 * Streaming assistant conversation for the top-bar sheet.
 * Facts and pending actions arrive as typed data parts from the chat route.
 */
export function AssistantPanel({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [input, setInput] = useState("");
  const [actionByMessage, setActionByMessage] = useState<
    Record<string, AssistantActionState>
  >({});
  const [preparedByMessage, setPreparedByMessage] = useState<
    Record<string, AssistantPendingActionWire>
  >({});
  const [banner, setBanner] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/assistant/chat" }),
    [],
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
    onError: (err) => {
      setBanner(err.message || "Couldn't answer right now.");
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  async function handleSubmit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setBanner(null);
    clearError();
    setInput("");
    await sendMessage({ text });
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  async function confirmPending(
    messageId: string,
    pending: AssistantPendingActionWire,
  ) {
    setActionByMessage((prev) => ({
      ...prev,
      [messageId]: { status: "running" },
    }));

    try {
      const response = await fetch("/api/assistant/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pending.token }),
      });
      const json = (await response.json()) as
        | AiAssistantActionOutcome
        | ConfirmErrorBody;
      if (!response.ok || !("status" in json) || json.status !== "executed") {
        const message =
          ("error" in json && json.error?.message) ||
          "Couldn't confirm that action.";
        setActionByMessage((prev) => ({
          ...prev,
          [messageId]: { status: "failed", message },
        }));
        return;
      }

      setActionByMessage((prev) => ({
        ...prev,
        [messageId]: { status: "executed", outcome: json },
      }));
    } catch {
      setActionByMessage((prev) => ({
        ...prev,
        [messageId]: {
          status: "failed",
          message: "Couldn't confirm that action.",
        },
      }));
    }
  }

  function cancelPending(messageId: string) {
    setActionByMessage((prev) => ({
      ...prev,
      [messageId]: { status: "cancelled" },
    }));
  }

  const showStarters = messages.length === 0 && !isStreaming;
  const errorMessage =
    banner ?? (error ? parseTransportError(error.message) : null);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-sidebar", className)}>
      <div
        ref={listRef}
        className={cn(
          "min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4",
          compact && "px-3 py-3",
        )}
      >
        {messages.length === 0 && !errorMessage ? <AssistantWelcome /> : null}

        {messages.map((message) => {
          const text = messageText(message.parts);
          if (message.role === "user") {
            return <UserBubble key={message.id} text={text} />;
          }

          const meta = metaFromParts(message.parts);
          const pendingAction =
            meta.pendingAction ?? preparedByMessage[message.id] ?? null;
          const isLast = message.id === messages[messages.length - 1]?.id;
          const streamingThis = isStreaming && isLast;
          const action =
            actionByMessage[message.id] ??
            ({ status: "proposed" } satisfies AssistantActionState);
          const activitySteps = activityStepsFromParts(
            message.parts,
            streamingThis,
          );

          return (
            <div key={message.id} className="flex flex-col gap-1">
              <AssistantMessageView
                text={text}
                facts={meta.facts}
                suggestions={meta.suggestions}
                notices={meta.notices}
                pendingAction={pendingAction}
                action={pendingAction ? action : { status: "cancelled" }}
                isStreaming={streamingThis}
                activitySteps={activitySteps}
                onConfirm={() => {
                  if (pendingAction) {
                    void confirmPending(message.id, pendingAction);
                  }
                }}
                onCancel={() => cancelPending(message.id)}
                onPrepare={(pending) => {
                  setPreparedByMessage((prev) => ({
                    ...prev,
                    [message.id]: pending,
                  }));
                  setActionByMessage((prev) => ({
                    ...prev,
                    [message.id]: { status: "proposed" },
                  }));
                }}
              />
            </div>
          );
        })}

        {errorMessage ? (
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-sidebar-border bg-sidebar px-4 py-3">
        {showStarters ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {STARTERS.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                disabled={isStreaming}
                onClick={() => {
                  void (async () => {
                    setBanner(null);
                    clearError();
                    await sendMessage({ text: prompt });
                    setInput("");
                  })();
                }}
              >
                {prompt}
              </Button>
            ))}
          </div>
        ) : null}

        <form
          className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div
            className={cn(
              "relative flex w-full flex-col overflow-hidden",
              " border border-border/40",
              "bg-muted/30 dark:bg-muted/20",
              "transition-all duration-200",
              "focus-within:border-border",
              "focus-within:bg-background",
              "focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
            )}
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Ask about your business…"
              rows={compact ? 2 : 3}
              disabled={isStreaming}
              className={cn(
                "min-h-0 w-full resize-none",
                "border-0 bg-transparent",
                "px-6 pt-5 pb-2",
                "text-[15px] leading-6",
                "shadow-none outline-none",
                "placeholder:text-muted-foreground/55",
                "focus-visible:ring-0",
                "focus-visible:ring-offset-0",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            />

            <div className="flex items-center justify-end px-4 pb-3">
              <Button
                type="submit"
                size="icon"
                disabled={isStreaming || input.trim().length === 0}
                aria-label="Send"
                className="size-9 rounded-full bg-foreground text-background shadow-sm transition-all duration-150 hover:bg-foreground/90 active:scale-95 disabled:bg-muted-foreground/20 disabled:text-muted-foreground/50 disabled:opacity-100"
              >
                <SendHorizonal className="size-5.25" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function parseTransportError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as AssistantErrorBody;
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // plain string
  }
  if (raw.length > 0 && raw.length < 200) return raw;
  return "Couldn't answer right now.";
}
