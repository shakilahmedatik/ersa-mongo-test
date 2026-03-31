import type {
  ChatStreamInput,
  ChatThreadCreateInput,
  ChatThreadUpdateInput,
} from "./chat.types";

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
};

export const parseChatStreamInput = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : payload.message !== undefined
      ? [payload.message]
      : null;

  if (!messages || messages.length === 0) {
    return null;
  }

  const id = normalizeString(payload.id);

  if (!id) {
    return null;
  }

  if (
    payload.trigger !== undefined &&
    payload.trigger !== "submit-message" &&
    payload.trigger !== "regenerate-message"
  ) {
    return null;
  }

  if (
    payload.messageId !== undefined &&
    normalizeString(payload.messageId) === null
  ) {
    return null;
  }

  return {
    id,
    messages: messages as ChatStreamInput["messages"],
    trigger: payload.trigger as ChatStreamInput["trigger"] | undefined,
    messageId:
      typeof payload.messageId === "string"
        ? payload.messageId.trim()
        : undefined,
  } satisfies ChatStreamInput;
};

export const parseThreadId = (value: string | null) => {
  return normalizeString(value);
};

export const parseChatThreadCreateInput = (value: unknown) => {
  if (value === null || value === undefined) {
    return {} satisfies ChatThreadCreateInput;
  }

  if (typeof value !== "object") {
    return null;
  }

  const title = normalizeString((value as Record<string, unknown>).title);

  return {
    title: title ?? undefined,
  } satisfies ChatThreadCreateInput;
};

export const parseChatThreadUpdateInput = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const threadId = normalizeString(payload.threadId);
  const title =
    "title" in payload ? (normalizeString(payload.title) ?? "") : undefined;
  const preview =
    "preview" in payload ? (normalizeString(payload.preview) ?? "") : undefined;

  if (!threadId) {
    return null;
  }

  if (title === undefined && preview === undefined) {
    return null;
  }

  return {
    threadId,
    title,
    preview,
  } satisfies ChatThreadUpdateInput;
};

export const parsePositiveIntegerQuery = (
  value: string | null,
  fallback: number,
  max: number,
) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};
