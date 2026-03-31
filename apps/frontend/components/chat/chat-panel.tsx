"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ThreadSidebar } from "@/components/chat/thread-sidebar";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/auth-client";
import { useChatWorkspace } from "@/features/chat/use-chat-workspace";

export function ChatPanel() {
  const { data: session, isPending } = authClient.useSession();
  const workspace = useChatWorkspace();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!workspace.activeThreadId) {
      return;
    }

    setIsSidebarOpen(false);
  }, [workspace.activeThreadId]);

  if (isPending) {
    return <LoadingSpinner text="Preparing your chat workspace" />;
  }

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,rgba(8,145,178,0.08),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.12),transparent_55%)] px-4 py-14 sm:px-6 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="border border-border bg-card p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Assistant workspace
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Sign in to open your conversation workspace.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              The interface is fully client-rendered, while authenticated chat,
              threads, memory, retrieval, and limits stay on the backend.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-in">
                <Button type="button">Sign in</Button>
              </Link>
              <Link href="/sign-up">
                <Button type="button" variant="outline">
                  Create account
                </Button>
              </Link>
            </div>
          </section>

          <section className="border border-border bg-background p-8">
            <p className="text-sm font-medium text-foreground">
              What you get after sign-in
            </p>
            <div className="mt-6 space-y-4 text-sm leading-6 text-muted-foreground">
              <p>Persistent conversation threads tied to your account.</p>
              <p>Streaming chat responses rendered through the AI SDK UI.</p>
              <p>
                Knowledge retrieval, memory, and rate limits enforced by the
                backend.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <ThreadSidebar
        activeThreadId={workspace.activeThreadId}
        canCreateThread={workspace.canCreateThread}
        deletingThreadId={workspace.deletingThreadId}
        isBusyCreatingThread={workspace.isBusyCreatingThread}
        isOpen={isSidebarOpen}
        isThreadsLoading={workspace.isThreadsLoading}
        onClose={() => {
          setIsSidebarOpen(false);
        }}
        onCreateThread={workspace.handleCreateThread}
        onDeleteThread={workspace.handleDeleteThread}
        onSelectThread={workspace.handleSelectThread}
        threads={workspace.threads}
      />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <ChatHeader
          activeThread={workspace.activeThread}
          onToggleSidebar={() => {
            setIsSidebarOpen((current) => !current);
          }}
        />

        <div className="pointer-events-none absolute top-[10%] right-[10%] -z-10 h-72 w-72 rounded-full bg-primary/7 blur-[90px]" />
        <div className="pointer-events-none absolute bottom-[10%] left-[10%] -z-10 h-72 w-72 rounded-full bg-cyan-400/7 blur-[90px]" />

        <div className="flex min-h-0 flex-1 flex-col px-4 py-4 md:px-5 lg:px-6">
          <ChatMessages
            globalError={workspace.globalError}
            isThreadLoading={workspace.isThreadLoading}
            messages={workspace.messages}
            threadLoadError={workspace.threadLoadError}
          />
        </div>

        <div className="shrink-0 border-t border-border bg-background/80 p-4 backdrop-blur md:px-5 lg:px-6">
          <ChatComposer
            activeThreadId={workspace.activeThreadId}
            input={workspace.input}
            isThreadsLoading={workspace.isThreadsLoading}
            onSubmit={workspace.handleSubmit}
            onUpdateInput={workspace.setInput}
            rateLimit={workspace.rateLimit}
            status={workspace.status}
            stop={workspace.stop}
          />
        </div>
      </main>
    </div>
  );
}
