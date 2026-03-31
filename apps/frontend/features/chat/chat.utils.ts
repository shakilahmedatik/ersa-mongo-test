import type { UIMessage } from "ai";
import {
  ACTIVE_THREAD_STORAGE_KEY_PREFIX,
  DEFAULT_THREAD_TITLE,
} from "./chat.constants";
import type { ChatThreadSummary } from "./chat.types";

export const getActiveThreadStorageKey = (resourceId: string) => {
  return `${ACTIVE_THREAD_STORAGE_KEY_PREFIX}:${resourceId}`;
};

export const sortThreadsByLatest = (threads: ChatThreadSummary[]) => {
  return [...threads].sort((left, right) => {
    return (
      new Date(right.updatedAt).valueOf() - new Date(left.updatedAt).valueOf()
    );
  });
};

export const getMessageText = (message: UIMessage) => {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }

      return "";
    })
    .join(" ")
    .trim();
};

export const getThreadPreview = (messages: UIMessage[]) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (!message) {
      continue;
    }

    const text = getMessageText(message);

    if (text) {
      return text.slice(0, 120);
    }
  }

  return "";
};

export const getSuggestedThreadTitle = (messages: UIMessage[]) => {
  const firstUserMessage = messages.find((message) => message.role === "user");

  if (!firstUserMessage) {
    return DEFAULT_THREAD_TITLE;
  }

  const text = getMessageText(firstUserMessage);

  if (!text) {
    return DEFAULT_THREAD_TITLE;
  }

  return text.slice(0, 48);
};
