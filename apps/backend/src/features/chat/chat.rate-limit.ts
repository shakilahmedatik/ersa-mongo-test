import type { Context, MiddlewareHandler } from "hono";
import type { AppBindings } from "../../app/bindings";
import { getEnv } from "../../config/env";
import type { ChatRateLimitStatus } from "./chat.types";

type RateLimitBucket = {
  count: number;
  resetAtMs: number;
};

declare global {
  var __ersaChatRateLimitStore: Map<string, RateLimitBucket> | undefined;
  var __ersaChatRateLimitCleanupStarted: boolean | undefined;
}

const getStore = () => {
  globalThis.__ersaChatRateLimitStore ??= new Map<string, RateLimitBucket>();

  return globalThis.__ersaChatRateLimitStore;
};

const getWindowMs = () => {
  return getEnv().chatRateLimitWindowSeconds * 1_000;
};

const getLimit = () => {
  return getEnv().chatRateLimitMaxRequests;
};

const getBucket = (userId: string) => {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(userId);

  if (!existing || existing.resetAtMs <= now) {
    const nextBucket = {
      count: 0,
      resetAtMs: now + getWindowMs(),
    };

    store.set(userId, nextBucket);

    return nextBucket;
  }

  return existing;
};

const getStatus = (bucket: RateLimitBucket): ChatRateLimitStatus => {
  return {
    limit: getLimit(),
    remaining: Math.max(0, getLimit() - bucket.count),
    resetAt: new Date(bucket.resetAtMs).toISOString(),
  };
};

const applyHeaders = (
  context: Context<AppBindings>,
  status: ChatRateLimitStatus,
) => {
  context.header("X-RateLimit-Limit", String(status.limit));
  context.header("X-RateLimit-Remaining", String(status.remaining));
  context.header(
    "X-RateLimit-Reset",
    String(Math.floor(new Date(status.resetAt).valueOf() / 1_000)),
  );
};

const startCleanup = () => {
  if (globalThis.__ersaChatRateLimitCleanupStarted) {
    return;
  }

  globalThis.__ersaChatRateLimitCleanupStarted = true;

  setInterval(() => {
    const now = Date.now();

    for (const [key, bucket] of getStore()) {
      if (bucket.resetAtMs <= now) {
        getStore().delete(key);
      }
    }
  }, 5 * 60_000).unref();
};

startCleanup();

export const getChatRateLimitStatus = (userId: string) => {
  return getStatus(getBucket(userId));
};

export const rateLimitChatMiddleware: MiddlewareHandler<AppBindings> = async (
  context,
  next,
) => {
  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  const bucket = getBucket(user.id);

  if (bucket.count >= getLimit()) {
    const status = getStatus(bucket);
    applyHeaders(context, status);

    return context.json(
      {
        error: "Chat rate limit exceeded. Please try again later.",
        ...status,
      },
      429,
    );
  }

  bucket.count += 1;
  const status = getStatus(bucket);
  applyHeaders(context, status);

  await next();
};
