import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../app/bindings";
import { createLogger } from "../infrastructure/logging/logger";

export const requestLoggerMiddleware: MiddlewareHandler<AppBindings> = async (
  context,
  next,
) => {
  const startedAt = performance.now();
  const requestId =
    context.req.header("x-request-id")?.trim() || crypto.randomUUID();
  const requestLogger = createLogger({
    scope: "http",
    requestId,
    method: context.req.method,
    path: context.req.path,
  });

  context.set("requestId", requestId);
  context.set("logger", requestLogger);

  requestLogger.info("Request started");

  try {
    await next();
  } finally {
    requestLogger.info(
      {
        statusCode: context.res.status,
        durationMs: Math.round(performance.now() - startedAt),
      },
      "Request completed",
    );
  }
};
