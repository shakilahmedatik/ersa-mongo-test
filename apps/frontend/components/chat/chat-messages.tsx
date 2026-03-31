"use client";

import type { ToolUIPart, UIMessage } from "ai";
import { AlertCircleIcon, LoaderCircleIcon, SparklesIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

type SafeToolStatus = {
  description: string;
  label: string;
  tone: "running" | "success";
};

const isToolPart = (part: UIMessage["parts"][number]): part is ToolUIPart => {
  return Boolean(part.type?.startsWith("tool-"));
};

const getTextContent = (message: UIMessage) => {
  const parts = message.parts || [];
  const text = parts
    .filter((part) => part.type === "text")
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }

      return "";
    })
    .join("\n")
    .trim();

  if (text) {
    return text;
  }

  const content = (message as { content?: string }).content;

  return typeof content === "string" ? content.trim() : "";
};

const getSafeToolStatus = (toolParts: ToolUIPart[]): SafeToolStatus | null => {
  const states = toolParts.map((part) => part.state || "output-available");
  const isRunning = states.some((state) => {
    return ["input-streaming", "input-available", "output-streaming"].includes(
      state,
    );
  });

  if (isRunning) {
    return {
      label: "Preparing answer",
      description:
        "The assistant is reviewing available context and assembling a response.",
      tone: "running",
    };
  }

  const hasRelevantInternalDocs = toolParts.some((part) => {
    if (part.state !== "output-available") {
      return false;
    }

    if (
      part.output &&
      typeof part.output === "object" &&
      "relevant" in part.output &&
      "source" in part.output
    ) {
      const output = part.output as {
        relevant?: unknown;
        source?: unknown;
      };

      return output.relevant === true && output.source === "internal-docs";
    }

    return false;
  });

  if (!hasRelevantInternalDocs) {
    return null;
  }

  return {
    label: "Knowledge applied",
    description:
      "Relevant internal knowledge was used while generating this reply.",
    tone: "success",
  };
};

function ToolActivitySummary({ toolParts }: { toolParts: ToolUIPart[] }) {
  const status = getSafeToolStatus(toolParts);

  if (!status) {
    return null;
  }

  return (
    <div
      className={`inline-flex max-w-xl items-start gap-2 rounded-full border px-3 py-2 text-xs ${
        status.tone === "running"
          ? "border-border bg-card/80 text-muted-foreground"
          : "border-primary/20 bg-primary/8 text-primary"
      }`}
    >
      {status.tone === "running" ? (
        <LoaderCircleIcon className="mt-0.5 size-3.5 shrink-0 animate-spin" />
      ) : (
        <SparklesIcon className="mt-0.5 size-3.5 shrink-0" />
      )}
      <div>
        <p className="font-medium">{status.label}</p>
        <p className="mt-0.5 text-muted-foreground">{status.description}</p>
      </div>
    </div>
  );
}

type ChatMessagesProps = {
  globalError: string;
  isThreadLoading: boolean;
  messages: UIMessage[];
  threadLoadError: string;
};

export function ChatMessages({
  globalError,
  isThreadLoading,
  messages,
  threadLoadError,
}: ChatMessagesProps) {
  return (
    <div className="min-h-0 min-w-0 flex-1">
      <Conversation className="h-full">
        <ConversationContent className="px-0 py-0">
          {isThreadLoading ? (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Loading conversation...
              </p>
            </div>
          ) : null}

          {!isThreadLoading && threadLoadError ? (
            <div className="px-4 md:px-0">
              <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {threadLoadError}
              </div>
            </div>
          ) : null}

          {!isThreadLoading && !threadLoadError && messages.length === 0 ? (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-6 text-center">
              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-semibold tracking-tight text-foreground/80">
                  Start a new chat
                </h3>
                <p className="text-sm text-muted-foreground">
                  Send a message to begin. Replies stream live while thread
                  memory and retrieval stay managed on the backend.
                </p>
              </div>
            </div>
          ) : null}

          {messages.map((message) => {
            const toolParts = (message.parts || []).filter(isToolPart);
            const textContent = getTextContent(message);
            const from = message.role === "user" ? "user" : "assistant";

            return (
              <div className="mb-4 space-y-2 last:mb-0" key={message.id}>
                {from === "assistant" && toolParts.length > 0 ? (
                  <ToolActivitySummary toolParts={toolParts} />
                ) : null}

                {textContent ? (
                  <Message from={from}>
                    <MessageContent>
                      <MessageResponse>{textContent}</MessageResponse>
                    </MessageContent>
                  </Message>
                ) : null}
              </div>
            );
          })}

          {globalError ? (
            <div className="mx-auto mt-4 max-w-2xl px-4 md:px-0">
              <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
                  <p>{globalError}</p>
                </div>
              </div>
            </div>
          ) : null}

          <ConversationScrollButton />
        </ConversationContent>
      </Conversation>
    </div>
  );
}
