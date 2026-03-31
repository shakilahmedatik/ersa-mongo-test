"use client";

import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { chatApi, resolveChatStreamUrl } from "./chat.api";
import { DEFAULT_THREAD_TITLE } from "./chat.constants";
import type {
  ChatRateLimitStatus,
  ChatThreadSummary,
  ChatThreadsPayload,
  ChatUiMessage,
} from "./chat.types";
import {
  getActiveThreadStorageKey,
  getSuggestedThreadTitle,
  getThreadPreview,
  sortThreadsByLatest,
} from "./chat.utils";

const resolveAssistantError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to reach the assistant right now.";
};

type UseChatWorkspaceResult = {
  activeThread: ChatThreadSummary | undefined;
  activeThreadId: string;
  canCreateThread: boolean;
  deletingThreadId: string;
  globalError: string;
  handleCreateThread: () => void;
  handleDeleteThread: (threadId: string) => Promise<void>;
  handleSelectThread: (threadId: string) => void;
  handleSubmit: (text: string) => Promise<void>;
  input: string;
  isBusyCreatingThread: boolean;
  isThreadLoading: boolean;
  isThreadsLoading: boolean;
  messages: ChatUiMessage[];
  rateLimit: ChatRateLimitStatus | null;
  setInput: (value: string) => void;
  status: ReturnType<typeof useChat>["status"];
  stop: () => void;
  threadLoadError: string;
  threads: ChatThreadSummary[];
};

export const useChatWorkspace = (): UseChatWorkspaceResult => {
  const queryClient = useQueryClient();
  const rateLimitQueryKey = ["chat", "rate-limit"] as const;
  const threadsQueryKey = ["chat", "threads"] as const;
  const [input, setInput] = useState("");
  const [activeThreadId, setActiveThreadId] = useState("");
  const [messagesThreadId, setMessagesThreadId] = useState("");
  const [deletingThreadId, setDeletingThreadId] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [threadLoadError, setThreadLoadError] = useState("");
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const hasCreatedInitialThread = useRef(false);

  const rateLimitQuery = useQuery({
    queryKey: rateLimitQueryKey,
    queryFn: chatApi.getRateLimitStatus,
    retry: 1,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
  const threadsQuery = useQuery({
    queryKey: threadsQueryKey,
    queryFn: chatApi.getThreads,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const threads = useMemo(() => {
    return sortThreadsByLatest(threadsQuery.data?.threads ?? []);
  }, [threadsQuery.data?.threads]);
  const resourceId = threadsQuery.data?.resourceId ?? "";
  const activeThread = threads.find((thread) => thread.id === activeThreadId);

  const updateThreadsCache = (
    updater: (currentThreads: ChatThreadSummary[]) => ChatThreadSummary[],
  ) => {
    queryClient.setQueryData<ChatThreadsPayload>(threadsQueryKey, (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        threads: sortThreadsByLatest(updater(current.threads)),
      };
    });
  };

  const syncRateLimit = async () => {
    await queryClient.fetchQuery({
      queryKey: rateLimitQueryKey,
      queryFn: chatApi.getRateLimitStatus,
    });
  };

  const consumeRateLimit = () => {
    queryClient.setQueryData<ChatRateLimitStatus>(
      rateLimitQueryKey,
      (current) => {
        if (!current) {
          return current;
        }

        const resetAtMs = new Date(current.resetAt).getTime();
        const isExpired = !Number.isNaN(resetAtMs) && resetAtMs <= Date.now();

        return {
          ...current,
          remaining: isExpired
            ? Math.max(0, current.limit - 1)
            : Math.max(0, current.remaining - 1),
        };
      },
    );
  };

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: resolveChatStreamUrl(),
      credentials: "include",
      headers: {
        Accept: "text/event-stream",
      },
      prepareSendMessagesRequest({ id, messages, trigger, messageId }) {
        return {
          body: {
            id,
            messages: [messages[messages.length - 1]],
            trigger,
            messageId,
          },
        };
      },
    });
  }, []);
  const { messages, sendMessage, setMessages, status, error, stop } =
    useChat<ChatUiMessage>({
      id: activeThreadId || "ersa-chat-placeholder",
      messages: [],
      transport,
    });

  const createThreadMutation = useMutation({
    mutationFn: (title?: string) => chatApi.createThread(title),
    onSuccess: (payload) => {
      queryClient.setQueryData<ChatThreadsPayload>(
        threadsQueryKey,
        (current) => {
          const nextThreads = current ? [...current.threads] : [];

          nextThreads.unshift(payload.thread);

          return {
            resourceId: payload.resourceId,
            threads: sortThreadsByLatest(nextThreads),
          };
        },
      );

      setActiveThreadId(payload.thread.id);
      setMessages([]);
      setMessagesThreadId("");
      setThreadLoadError("");
      setGlobalError("");
      setInput("");
    },
  });
  const deleteThreadMutation = useMutation({
    mutationFn: chatApi.deleteThread,
  });

  useEffect(() => {
    if (threadsQuery.isPending || threads.length === 0 || activeThreadId) {
      return;
    }

    const urlThreadId = new URLSearchParams(window.location.search).get(
      "threadId",
    );
    const savedActiveThreadId = resourceId
      ? window.localStorage.getItem(getActiveThreadStorageKey(resourceId))
      : null;
    const nextActiveThreadId = threads.some(
      (thread) => thread.id === urlThreadId,
    )
      ? (urlThreadId as string)
      : threads.some((thread) => thread.id === savedActiveThreadId)
        ? (savedActiveThreadId as string)
        : threads[0]?.id;

    if (nextActiveThreadId) {
      setActiveThreadId(nextActiveThreadId);
    }
  }, [activeThreadId, resourceId, threads, threadsQuery.isPending]);

  useEffect(() => {
    if (!resourceId || !activeThreadId) {
      return;
    }

    window.localStorage.setItem(
      getActiveThreadStorageKey(resourceId),
      activeThreadId,
    );

    const currentUrl = new URL(window.location.href);

    if (currentUrl.searchParams.get("threadId") !== activeThreadId) {
      currentUrl.searchParams.set("threadId", activeThreadId);
      window.history.replaceState(
        {},
        "",
        `${currentUrl.pathname}?${currentUrl.searchParams.toString()}`,
      );
    }
  }, [activeThreadId, resourceId]);

  useEffect(() => {
    if (
      !threadsQuery.isPending &&
      threads.length === 0 &&
      !createThreadMutation.isPending &&
      !hasCreatedInitialThread.current
    ) {
      hasCreatedInitialThread.current = true;
      createThreadMutation.mutate(DEFAULT_THREAD_TITLE);
    }

    if (!threadsQuery.isPending && threads.length > 0) {
      hasCreatedInitialThread.current = false;
    }
  }, [createThreadMutation, threads.length, threadsQuery.isPending]);

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    const abortController = new AbortController();

    const run = async () => {
      setThreadLoadError("");
      setIsThreadLoading(true);
      setMessages([]);
      setMessagesThreadId("");

      try {
        const payload = await chatApi.getHistory(
          activeThreadId,
          abortController.signal,
        );

        setMessages(payload.messages);
        setMessagesThreadId(activeThreadId);
      } catch (nextError) {
        const typedError = nextError as Error;

        if (typedError.name !== "AbortError") {
          setThreadLoadError("Could not load this thread.");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsThreadLoading(false);
        }
      }
    };

    void run();

    return () => {
      abortController.abort();
    };
  }, [activeThreadId, setMessages]);

  const canCreateThread = useMemo(() => {
    if (threadsQuery.isPending) {
      return false;
    }

    if (threads.length === 0) {
      return true;
    }

    const latestThread = threads[0];

    if (
      latestThread &&
      !latestThread.preview &&
      latestThread.title === DEFAULT_THREAD_TITLE
    ) {
      return false;
    }

    return true;
  }, [threads, threadsQuery.isPending]);

  const handleCreateThread = () => {
    if (!canCreateThread || createThreadMutation.isPending) {
      return;
    }

    createThreadMutation.mutate(DEFAULT_THREAD_TITLE);
  };

  const handleSelectThread = (threadId: string) => {
    setGlobalError("");
    setThreadLoadError("");
    setActiveThreadId(threadId);
  };

  const handleDeleteThread = async (threadId: string) => {
    const shouldDelete = window.confirm(
      "Delete this thread? This action cannot be undone.",
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingThreadId(threadId);

    try {
      await deleteThreadMutation.mutateAsync(threadId);
      updateThreadsCache((currentThreads) => {
        return currentThreads.filter((thread) => thread.id !== threadId);
      });

      const remainingThreads = threads.filter(
        (thread) => thread.id !== threadId,
      );

      if (activeThreadId === threadId) {
        if (remainingThreads[0]?.id) {
          setActiveThreadId(remainingThreads[0].id);
        } else {
          setActiveThreadId("");
          createThreadMutation.mutate(DEFAULT_THREAD_TITLE);
        }
      }
    } catch (nextError) {
      setGlobalError(resolveAssistantError(nextError));
    } finally {
      setDeletingThreadId("");
    }
  };

  const handleSubmit = async (text: string) => {
    const trimmed = text.trim();

    if (
      !trimmed ||
      !activeThreadId ||
      status === "submitted" ||
      status === "streaming"
    ) {
      return;
    }

    setGlobalError("");
    setInput("");

    const cachedRateLimit =
      queryClient.getQueryData<ChatRateLimitStatus>(rateLimitQueryKey);

    if (cachedRateLimit) {
      const resetAtMs = new Date(cachedRateLimit.resetAt).getTime();

      if (!Number.isNaN(resetAtMs) && resetAtMs <= Date.now()) {
        try {
          await syncRateLimit();
        } catch {
          // Keep the current UI responsive even if the sync request fails.
        }
      }
    }

    const optimisticMessages = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: trimmed,
          },
        ],
      } satisfies UIMessage,
    ];

    if (messagesThreadId === activeThreadId) {
      const nextTitle =
        activeThread?.title === DEFAULT_THREAD_TITLE
          ? getSuggestedThreadTitle(optimisticMessages)
          : (activeThread?.title ?? DEFAULT_THREAD_TITLE);

      updateThreadsCache((currentThreads) => {
        return currentThreads.map((thread) => {
          if (thread.id !== activeThreadId) {
            return thread;
          }

          return {
            ...thread,
            title: nextTitle,
            preview: getThreadPreview(optimisticMessages),
            updatedAt: new Date().toISOString(),
          };
        });
      });
    }

    consumeRateLimit();

    try {
      await sendMessage({
        text: trimmed,
      });
    } catch (nextError) {
      void syncRateLimit().catch(() => undefined);
      setGlobalError(resolveAssistantError(nextError));
    }
  };

  return {
    activeThread,
    activeThreadId,
    canCreateThread,
    deletingThreadId,
    globalError:
      globalError ||
      (error
        ? resolveAssistantError(
            error instanceof Error ? error : new Error(String(error)),
          )
        : ""),
    handleCreateThread,
    handleDeleteThread,
    handleSelectThread,
    handleSubmit,
    input,
    isBusyCreatingThread: createThreadMutation.isPending,
    isThreadLoading,
    isThreadsLoading: threadsQuery.isPending,
    messages,
    rateLimit: rateLimitQuery.data ?? null,
    setInput,
    status,
    stop,
    threadLoadError:
      threadLoadError ||
      (threadsQuery.isError ? resolveAssistantError(threadsQuery.error) : ""),
    threads,
  };
};
