import { resolveApiError, resolveApiUrl } from "@/lib/api-client";
import type {
  ChatHistory,
  ChatRateLimitStatus,
  ChatThreadPayload,
  ChatThreadsPayload,
} from "./chat.types";

const getJsonHeaders = () => {
  return {
    "content-type": "application/json",
  };
};

export const chatApi = {
  async getRateLimitStatus() {
    const response = await fetch(resolveApiUrl("/chat/rate-limit"), {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as ChatRateLimitStatus;
  },

  async getThreads() {
    const response = await fetch(resolveApiUrl("/chat/threads"), {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as ChatThreadsPayload;
  },

  async createThread(title?: string) {
    const response = await fetch(resolveApiUrl("/chat/threads"), {
      method: "POST",
      credentials: "include",
      headers: getJsonHeaders(),
      body: JSON.stringify({
        title,
      }),
    });

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as ChatThreadPayload;
  },

  async deleteThread(threadId: string) {
    const response = await fetch(
      resolveApiUrl(`/chat/threads?threadId=${encodeURIComponent(threadId)}`),
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as { success: boolean };
  },

  async getHistory(threadId: string, signal?: AbortSignal) {
    const response = await fetch(
      resolveApiUrl(`/chat/history?threadId=${encodeURIComponent(threadId)}`),
      {
        credentials: "include",
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as ChatHistory;
  },
};

export const resolveChatStreamUrl = () => {
  return resolveApiUrl("/chat/stream");
};

export { resolveApiError };
