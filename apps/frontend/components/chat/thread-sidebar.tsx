"use client";

import { MessageSquarePlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import type { ChatThreadSummary } from "@/features/chat/chat.types";
import { cn } from "@/lib/utils";

type ThreadSidebarProps = {
  activeThreadId: string;
  canCreateThread: boolean;
  deletingThreadId: string;
  isBusyCreatingThread: boolean;
  isOpen: boolean;
  isThreadsLoading: boolean;
  onClose: () => void;
  onCreateThread: () => void;
  onDeleteThread: (threadId: string) => Promise<void>;
  onSelectThread: (threadId: string) => void;
  threads: ChatThreadSummary[];
};

const formatThreadTitle = (title: string) => {
  const normalized = title.trim() || "New thread";

  return normalized.length <= 28
    ? normalized
    : `${normalized.slice(0, 27).trimEnd()}…`;
};

export function ThreadSidebar({
  activeThreadId,
  canCreateThread,
  deletingThreadId,
  isBusyCreatingThread,
  isOpen,
  isThreadsLoading,
  onClose,
  onCreateThread,
  onDeleteThread,
  onSelectThread,
  threads,
}: ThreadSidebarProps) {
  return (
    <>
      {isOpen ? (
        <button
          aria-label="Close thread list"
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-80 max-w-[88vw] flex-col border-r border-border bg-card/95 backdrop-blur-xl transition-transform duration-300 md:static md:z-auto md:w-72 md:max-w-none md:translate-x-0 lg:w-80",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[65px] items-center border-b border-border px-4 lg:px-5">
          <Link className="flex min-w-0 items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-semibold tracking-[0.18em] text-primary">
              EC
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                Ersa Chat
              </p>
              <p className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Conversation hub
              </p>
            </div>
          </Link>
        </div>

        <div className="border-b border-border p-3 md:p-3.5 lg:p-4">
          <button
            className="inline-flex h-11 w-full items-center justify-start gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              !canCreateThread || isBusyCreatingThread || isThreadsLoading
            }
            onClick={onCreateThread}
            type="button"
          >
            <MessageSquarePlusIcon className="size-4" />
            {isBusyCreatingThread ? "Opening thread..." : "New conversation"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2.5 md:p-3">
          {isThreadsLoading ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Loading conversations...
            </p>
          ) : threads.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <div className="space-y-3">
              {threads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const isDeleting = deletingThreadId === thread.id;

                return (
                  <div
                    className={cn(
                      "group relative flex w-full items-start justify-between gap-2 rounded-2xl border bg-background/90 px-3 py-3 shadow-xs transition-all",
                      isActive
                        ? "border-primary/40 bg-primary/8 shadow-[0_0_20px_rgba(8,145,178,0.08)]"
                        : "border-border hover:border-primary/20",
                      isDeleting && "opacity-60 grayscale-[0.2]",
                    )}
                    key={thread.id}
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      disabled={isDeleting}
                      onClick={() => {
                        onSelectThread(thread.id);
                        onClose();
                      }}
                      type="button"
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {formatThreadTitle(thread.title)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {thread.preview || "No message preview yet"}
                      </p>
                    </button>

                    <button
                      className="rounded-xl p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isDeleting}
                      onClick={() => {
                        void onDeleteThread(thread.id);
                      }}
                      type="button"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
