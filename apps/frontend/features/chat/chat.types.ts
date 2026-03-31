import type { UIMessage } from "ai";

export type ChatDescriptor = {
  agentId: string;
  name: string;
  description: string;
  model: string;
};

export type ChatUiMessage = UIMessage;

export type ChatHistory = {
  threadId: string;
  messages: ChatUiMessage[];
};

export type ChatThreadSummary = {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatThreadsPayload = {
  resourceId: string;
  threads: ChatThreadSummary[];
};

export type ChatThreadPayload = {
  resourceId: string;
  thread: ChatThreadSummary;
};

export type ChatRateLimitStatus = {
  limit: number;
  remaining: number;
  resetAt: string;
};
