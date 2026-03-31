"use client";

import type { ChatStatus } from "ai";
import { SendHorizontalIcon, SquareIcon, TimerIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import type { ChatRateLimitStatus } from "@/features/chat/chat.types";

type ChatComposerProps = {
  activeThreadId: string;
  input: string;
  isThreadsLoading: boolean;
  onSubmit: (text: string) => Promise<void>;
  onUpdateInput: (value: string) => void;
  rateLimit: ChatRateLimitStatus | null;
  status: ChatStatus;
  stop: () => void;
};

function RateLimitIndicator({ rateLimit }: { rateLimit: ChatRateLimitStatus }) {
  const isExceeded = rateLimit.remaining <= 0;
  const percentage = (rateLimit.remaining / rateLimit.limit) * 100;
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!isExceeded) {
      setTimeLeft("");
      return;
    }

    const update = () => {
      const diff = new Date(rateLimit.resetAt).getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("now");
        return;
      }

      const minutes = Math.floor(diff / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1_000);

      setTimeLeft(`${minutes}m ${seconds}s`);
    };

    update();

    const timer = window.setInterval(update, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isExceeded, rateLimit.resetAt]);

  if (isExceeded) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-destructive">
        <TimerIcon className="size-3" />
        <span>Limit reached, resets in {timeLeft}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-border/70">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percentage > 50
              ? "bg-emerald-400/70"
              : percentage > 20
                ? "bg-amber-400/70"
                : "bg-red-400/70"
          }`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
      <span>
        {rateLimit.remaining}/{rateLimit.limit}
      </span>
    </div>
  );
}

export function ChatComposer({
  activeThreadId,
  input,
  isThreadsLoading,
  onSubmit,
  onUpdateInput,
  rateLimit,
  status,
  stop,
}: ChatComposerProps) {
  const isStreaming = status === "submitted" || status === "streaming";
  const isRateLimited = rateLimit ? rateLimit.remaining <= 0 : false;
  const isDisabled =
    !activeThreadId || isThreadsLoading || isRateLimited || status !== "ready";

  return (
    <div className="w-full">
      <PromptInput
        className="rounded-[1.5rem] border border-border bg-card/90 shadow-sm"
        onSubmit={(message, event) => {
          event.preventDefault();
          void onSubmit(message.text);
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea
            className="min-h-24 py-3 leading-relaxed"
            disabled={isStreaming || !activeThreadId || isThreadsLoading}
            onChange={(event) => onUpdateInput(event.target.value)}
            placeholder="Write your message..."
            value={input}
          />
        </PromptInputBody>

        <PromptInputFooter className="px-3 pb-2 pt-0">
          <PromptInputTools>
            <p className="text-xs text-muted-foreground md:text-sm">
              Live responses, persistent threads, and backend-managed context.
            </p>
          </PromptInputTools>

          {isStreaming ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:border-primary/20"
              onClick={stop}
              type="button"
            >
              <SquareIcon className="size-3.5" />
              Stop
            </button>
          ) : (
            <PromptInputSubmit
              className="h-10 w-10 rounded-full"
              disabled={isDisabled}
              type="submit"
            >
              <SendHorizontalIcon className="size-4" />
            </PromptInputSubmit>
          )}
        </PromptInputFooter>
      </PromptInput>

      {rateLimit ? (
        <div className="mt-3 flex justify-end">
          <RateLimitIndicator rateLimit={rateLimit} />
        </div>
      ) : null}
    </div>
  );
}
