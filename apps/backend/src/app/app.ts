import { Hono } from "hono";
import { authRoutes } from "../features/auth/auth.routes";
import { authService } from "../features/auth/auth.service";
import { logger } from "../infrastructure/logging/logger";
import { requestLoggerMiddleware } from "../middleware/request-logger.middleware";
import { sessionMiddleware } from "../middleware/session.middleware";
import type { AppBindings } from "./bindings";

export const app = new Hono<AppBindings>();

app.onError((error, context) => {
  const requestLogger = context.var.logger;

  requestLogger?.error({ err: error }, "Unhandled request error");
  logger.error({ err: error }, "Unhandled application error");

  return context.json(
    {
      error: "Internal server error",
    },
    500,
  );
});

app.use("*", requestLoggerMiddleware);
app.use("*", sessionMiddleware);

app.get("/", (context) => {
  return context.json({
    message: "Backend authentication server is running",
    requestId: context.var.requestId,
  });
});

app.route("/auth", authRoutes);

app.on(["GET", "POST"], "/api/auth/*", (context) => {
  return authService.handleBetterAuth(context.req.raw);
});
