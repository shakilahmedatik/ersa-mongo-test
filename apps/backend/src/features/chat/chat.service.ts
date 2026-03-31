import { randomUUID } from "node:crypto";
import { handleChatStream } from "@mastra/ai-sdk";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import type { UIMessage } from "ai";
import { getEnv } from "../../config/env";
import {
  chatAssistantAgent,
  chatAssistantAgentId,
  chatAssistantAgentName,
} from "../../infrastructure/ai/mastra/assistant.agent";
import { getChatMemory } from "../../infrastructure/ai/mastra/chat.memory";
import { getMastra } from "../../infrastructure/ai/mastra/mastra";
import { createLogger } from "../../infrastructure/logging/logger";
import { getChatRateLimitStatus } from "./chat.rate-limit";
import type {
  ChatAgentDescriptor,
  ChatHistory,
  ChatHistoryParams,
  ChatRateLimitStatus,
  ChatStreamParams,
  ChatThreadCreateInput,
  ChatThreadPayload,
  ChatThreadSummary,
  ChatThreadsPayload,
  ChatThreadUpdateInput,
} from "./chat.types";

const logger = createLogger({ feature: "chat" });
const defaultThreadTitle = "New Thread";
const maxThreadTitleLength = 120;
const maxThreadPreviewLength = 160;

type StoredThread = {
  id: string;
  resourceId: string;
  title?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type StoredThreadInput = {
  id: string;
  resourceId: string;
  title?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const isMissingThreadError = (error: unknown, threadId: string) => {
  return (
    error instanceof Error &&
    error.message === `No thread found with id ${threadId}`
  );
};

const toAuthUserId = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return String(value);
};

const normalizeThreadTitle = (value?: string | null) => {
  const normalized = value?.trim();

  if (!normalized) {
    return defaultThreadTitle;
  }

  return normalized.slice(0, maxThreadTitleLength);
};

const normalizeThreadPreview = (value?: string | null) => {
  const normalized = value?.trim() ?? "";

  return normalized.slice(0, maxThreadPreviewLength);
};

const createThreadId = (resourceId: string) => {
  return `${resourceId}-thread-${Date.now()}-${randomUUID().slice(0, 8)}`;
};

const isThreadOwnedByUser = (threadId: string, resourceId: string) => {
  return threadId.startsWith(`${resourceId}-thread-`);
};

const getMessageText = (message?: UIMessage) => {
  if (!message) {
    return "";
  }

  return message.parts
    .filter(
      (part): part is Extract<UIMessage["parts"][number], { type: "text" }> => {
        return part.type === "text";
      },
    )
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
};

const getLatestUserMessage = (messages: UIMessage[]) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message?.role === "user") {
      return message;
    }
  }

  return null;
};

const toIsoString = (value: Date | string | undefined) => {
  const parsed = new Date(value ?? new Date());

  return Number.isNaN(parsed.valueOf())
    ? new Date().toISOString()
    : parsed.toISOString();
};

const toThreadSummary = (thread: StoredThread): ChatThreadSummary => {
  const preview =
    typeof thread.metadata?.uiPreview === "string"
      ? thread.metadata.uiPreview
      : "";

  return {
    id: thread.id,
    title: normalizeThreadTitle(thread.title),
    preview: normalizeThreadPreview(preview),
    createdAt: toIsoString(thread.createdAt),
    updatedAt: toIsoString(thread.updatedAt),
  };
};

const toHistoryResponse = (
  threadId: string,
  messages: Awaited<
    ReturnType<ReturnType<typeof getChatMemory>["recall"]>
  >["messages"],
): ChatHistory => {
  return {
    threadId,
    messages: toAISdkV5Messages(messages).filter((message) => {
      return message.role !== "system";
    }) as UIMessage[],
  };
};

const ensureOwnedThread = (threadId: string, resourceId: string) => {
  if (!isThreadOwnedByUser(threadId, resourceId)) {
    throw new Error("Invalid thread id");
  }
};

const getStoredThread = async (threadId: string) => {
  return (await getChatMemory().getThreadById({
    threadId,
  })) as StoredThread | null;
};

const saveThread = async (thread: StoredThreadInput) => {
  return (await getChatMemory().saveThread({
    thread,
  })) as StoredThread;
};

const updateThread = async (thread: StoredThread, resourceId: string) => {
  return (await getChatMemory().updateThread({
    id: thread.id,
    title: normalizeThreadTitle(thread.title),
    metadata: {
      ...(thread.metadata ?? {}),
      resourceId,
      uiPreview: normalizeThreadPreview(
        typeof thread.metadata?.uiPreview === "string"
          ? thread.metadata.uiPreview
          : "",
      ),
    },
  })) as StoredThread;
};

const ensureThreadExists = async (
  threadId: string,
  resourceId: string,
  latestMessage?: UIMessage | null,
) => {
  const existing = await getStoredThread(threadId);

  if (existing) {
    return existing;
  }

  const now = new Date();

  return saveThread({
    id: threadId,
    resourceId,
    title: defaultThreadTitle,
    metadata: {
      resourceId,
      uiPreview: normalizeThreadPreview(
        getMessageText(latestMessage ?? undefined),
      ),
    },
    createdAt: now,
    updatedAt: now,
  });
};

const maybeRefreshThreadSummary = async (
  resourceId: string,
  threadId: string,
  latestUserMessage: UIMessage,
) => {
  const existing = await ensureThreadExists(
    threadId,
    resourceId,
    latestUserMessage,
  );
  const latestText = getMessageText(latestUserMessage);
  let title = normalizeThreadTitle(existing.title);

  if (title === defaultThreadTitle && latestText) {
    try {
      const generatedTitle =
        await chatAssistantAgent.generateTitleFromUserMessage({
          message: latestText,
          tracingContext: {},
        });

      if (generatedTitle?.trim()) {
        title = normalizeThreadTitle(generatedTitle);
      }
    } catch (error) {
      logger.warn(
        {
          err: error,
          chatId: threadId,
          authUserId: resourceId,
        },
        "Thread title generation failed; falling back to default title",
      );
    }
  }

  await updateThread(
    {
      ...existing,
      title,
      updatedAt: new Date(),
      metadata: {
        ...(existing.metadata ?? {}),
        resourceId,
        uiPreview: normalizeThreadPreview(latestText),
      },
    },
    resourceId,
  );
};

export const chatService = {
  getDescriptor(): ChatAgentDescriptor {
    return {
      agentId: chatAssistantAgentId,
      name: "Ersa Chat Assistant",
      description:
        "Persistent authenticated chat with threads, memory, and internal knowledge retrieval.",
      model: getEnv().assistantModel,
    };
  },

  getRateLimitStatus(userId: string): ChatRateLimitStatus {
    return getChatRateLimitStatus(userId);
  },

  async listThreads(
    user: ChatHistoryParams["user"],
  ): Promise<ChatThreadsPayload> {
    const resourceId = toAuthUserId(user.id);
    const result = await getChatMemory().listThreads({
      filter: {
        resourceId,
      },
      orderBy: {
        field: "updatedAt",
        direction: "DESC",
      },
      page: 0,
      perPage: 100,
    });

    return {
      resourceId,
      threads: result.threads.map((thread) => {
        return toThreadSummary(thread as StoredThread);
      }),
    };
  },

  async createThread(
    user: ChatHistoryParams["user"],
    input: ChatThreadCreateInput,
  ): Promise<ChatThreadPayload> {
    const resourceId = toAuthUserId(user.id);
    const now = new Date();
    const thread = await saveThread({
      id: createThreadId(resourceId),
      resourceId,
      title: normalizeThreadTitle(input.title),
      metadata: {
        resourceId,
        uiPreview: "",
      },
      createdAt: now,
      updatedAt: now,
    });

    return {
      resourceId,
      thread: toThreadSummary(thread),
    };
  },

  async updateThread(
    user: ChatHistoryParams["user"],
    input: ChatThreadUpdateInput,
  ) {
    const resourceId = toAuthUserId(user.id);

    ensureOwnedThread(input.threadId, resourceId);

    const existing = await getStoredThread(input.threadId);

    if (!existing) {
      return null;
    }

    const updated = await updateThread(
      {
        ...existing,
        title: input.title ? normalizeThreadTitle(input.title) : existing.title,
        updatedAt: new Date(),
        metadata: {
          ...(existing.metadata ?? {}),
          resourceId,
          uiPreview:
            input.preview !== undefined
              ? normalizeThreadPreview(input.preview)
              : typeof existing.metadata?.uiPreview === "string"
                ? existing.metadata.uiPreview
                : "",
        },
      },
      resourceId,
    );

    return {
      resourceId,
      thread: toThreadSummary(updated),
    } satisfies ChatThreadPayload;
  },

  async deleteThread(user: ChatHistoryParams["user"], threadId: string) {
    const resourceId = toAuthUserId(user.id);

    ensureOwnedThread(threadId, resourceId);

    const existing = await getStoredThread(threadId);

    if (!existing) {
      return false;
    }

    await getChatMemory().deleteThread(threadId);

    return true;
  },

  async getHistory({
    threadId,
    user,
  }: ChatHistoryParams): Promise<ChatHistory> {
    const resourceId = toAuthUserId(user.id);

    ensureOwnedThread(threadId, resourceId);

    try {
      const result = await getChatMemory().recall({
        threadId,
        resourceId,
        page: 0,
        perPage: false,
        orderBy: {
          field: "createdAt",
          direction: "ASC",
        },
      });

      return toHistoryResponse(threadId, result.messages);
    } catch (error) {
      if (isMissingThreadError(error, threadId)) {
        logger.info(
          {
            authUserId: resourceId,
            chatId: threadId,
          },
          "Chat history requested for a new thread",
        );

        return {
          threadId,
          messages: [],
        };
      }

      throw error;
    }
  },

  async stream({ payload, user }: ChatStreamParams) {
    const resourceId = toAuthUserId(user.id);

    ensureOwnedThread(payload.id, resourceId);

    const latestUserMessage = getLatestUserMessage(payload.messages);

    if (!latestUserMessage) {
      throw new Error("No user message found");
    }

    await maybeRefreshThreadSummary(resourceId, payload.id, latestUserMessage);

    logger.info(
      {
        authUserId: resourceId,
        chatId: payload.id,
        messageCount: payload.messages.length,
        trigger: payload.trigger,
      },
      "Starting streamed chat response",
    );

    const stream = await handleChatStream({
      mastra: getMastra(),
      agentId: chatAssistantAgentName,
      version: "v6",
      params: {
        id: payload.id,
        messages: [latestUserMessage],
        trigger: payload.trigger,
        messageId: payload.messageId,
        memory: {
          thread: payload.id,
          resource: resourceId,
        },
      } as Parameters<typeof handleChatStream>[0]["params"],
    });

    logger.info(
      {
        authUserId: resourceId,
        chatId: payload.id,
      },
      "Streamed chat response initialized",
    );

    return stream;
  },
};
