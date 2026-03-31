import type { UIMessage } from "ai";
import type { AuthUser } from "../auth/auth.types";

export type ChatAgentDescriptor = {
  agentId: string;
  name: string;
  description: string;
  model: string;
};

export type ChatUiMessage = UIMessage;

export type ChatStreamInput = {
  id: string;
  messages: ChatUiMessage[];
  trigger?: "submit-message" | "regenerate-message";
  messageId?: string;
};

export type ChatStreamParams = {
  payload: ChatStreamInput;
  user: AuthUser;
};

export type ChatHistoryParams = {
  threadId: string;
  user: AuthUser;
};

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

export type ChatThreadCreateInput = {
  title?: string;
};

export type ChatThreadUpdateInput = {
  threadId: string;
  title?: string;
  preview?: string;
};

export type ChatRateLimitStatus = {
  limit: number;
  remaining: number;
  resetAt: string;
};
