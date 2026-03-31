"use client";

import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { chatApi, resolveChatStreamUrl } from "./chat.api";
import { DEFAULT_THREAD_TITLE } from "./chat.constants";
import type {
  ChatDescriptor,
  ChatRateLimitStatus,
  ChatThreadSummary,
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
  descriptor: ChatDescriptor | undefined;
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
  const [input, setInput] = useState("");
  const [activeThreadId, setActiveThreadId] = useState("");
  const [messagesThreadId, setMessagesThreadId] = useState("");
  const [deletingThreadId, setDeletingThreadId] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [threadLoadError, setThreadLoadError] = useState("");
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const hasCreatedInitialThread = useRef(false);

  const descriptorQuery = useQuery({
    queryKey: ["chat", "descriptor"],
    queryFn: chatApi.getDescriptor,
    retry: 1,
  });
  const rateLimitQuery = useQuery({
    queryKey: ["chat", "rate-limit"],
    queryFn: chatApi.getRateLimitStatus,
    retry: 1,
    refetchInterval: 60_000,
    staleTime: 10_000,
  });
  const threadsQuery = useQuery({
    queryKey: ["chat", "threads"],
    queryFn: chatApi.getThreads,
    staleTime: 30_000,
  });

  const threads = useMemo(() => {
    return sortThreadsByLatest(threadsQuery.data?.threads ?? []);
  }, [threadsQuery.data?.threads]);
  const resourceId = threadsQuery.data?.resourceId ?? "";
  const activeThread = threads.find((thread) => thread.id === activeThreadId);
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
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({
        queryKey: ["chat", "threads"],
      });
      setActiveThreadId(payload.thread.id);
      setMessages([]);
      setMessagesThreadId("");
      setThreadLoadError("");
      setGlobalError("");
      setInput("");
    },
  });
  const updateThreadMutation = useMutation({
    mutationFn: (value: {
      threadId: string;
      title?: string;
      preview?: string;
    }) => chatApi.updateThread(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["chat", "threads"],
      });
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

  useEffect(() => {
    if (status === "ready" && activeThreadId) {
      void queryClient.invalidateQueries({
        queryKey: ["chat", "threads"],
      });
      void rateLimitQuery.refetch();
    }
  }, [activeThreadId, queryClient, rateLimitQuery, status]);

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
      await queryClient.invalidateQueries({
        queryKey: ["chat", "threads"],
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
      void updateThreadMutation.mutate({
        threadId: activeThreadId,
        title:
          activeThread?.title === DEFAULT_THREAD_TITLE
            ? getSuggestedThreadTitle(optimisticMessages)
            : undefined,
        preview: getThreadPreview(optimisticMessages),
      });
    }

    try {
      await sendMessage({
        text: trimmed,
      });
    } catch (nextError) {
      setGlobalError(resolveAssistantError(nextError));
    }
  };

  return {
    activeThread,
    activeThreadId,
    canCreateThread,
    deletingThreadId,
    descriptor: descriptorQuery.data,
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
      (threadsQuery.isError
        ? resolveAssistantError(threadsQuery.error)
        : descriptorQuery.isError
          ? resolveAssistantError(descriptorQuery.error)
          : ""),
    threads,
  };
};
