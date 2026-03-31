import { Hono } from "hono";
import { cors } from "hono/cors";
import { getEnv } from "../config/env";
import { adminRoutes } from "../features/admin/admin.routes";
import { authRoutes } from "../features/auth/auth.routes";
import { authService } from "../features/auth/auth.service";
import { chatRoutes } from "../features/chat/chat.routes";
import {
  initializeMastraServer,
  mastraApiPrefix,
} from "../infrastructure/ai/mastra/server";
import { DatabaseUnavailableError } from "../infrastructure/database/mongo";
import { logger } from "../infrastructure/logging/logger";
import { requestLoggerMiddleware } from "../middleware/request-logger.middleware";
import { requireUserMiddleware } from "../middleware/require-user.middleware";
import { sessionMiddleware } from "../middleware/session.middleware";
import type { AppBindings } from "./bindings";

let appPromise: Promise<Hono<AppBindings>> | undefined;

const buildApp = async () => {
  const app = new Hono<AppBindings>();
  const env = getEnv();
  const credentialedCors = cors({
    origin: env.corsOrigins,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 600,
  });

  app.use("/auth/*", credentialedCors);
  app.use("/api/auth/*", credentialedCors);
  app.use("/chat/*", credentialedCors);
  app.use("/admin/*", credentialedCors);
  app.use(`${mastraApiPrefix}/*`, credentialedCors);

  app.onError((error, context) => {
    const requestLogger = context.var.logger;
    const statusCode = error instanceof DatabaseUnavailableError ? 503 : 500;
    const responseMessage =
      error instanceof DatabaseUnavailableError
        ? error.message
        : "Internal server error";

    requestLogger?.error({ err: error }, "Unhandled request error");
    logger.error({ err: error }, "Unhandled application error");

    return context.json(
      {
        error: responseMessage,
      },
      statusCode,
    );
  });

  app.use("*", requestLoggerMiddleware);
  app.use("*", sessionMiddleware);
  app.use("/chat/*", requireUserMiddleware);
  app.use(`${mastraApiPrefix}/*`, requireUserMiddleware);

  app.get("/", (context) => {
    return context.json({
      message: "Backend application is running",
      requestId: context.var.requestId,
    });
  });

  app.route("/auth", authRoutes);
  app.route("/chat", chatRoutes);
  app.route("/admin", adminRoutes);

  app.on(["GET", "POST"], "/api/auth/*", (context) => {
    return authService.handleBetterAuth(context.req.raw);
  });

  await initializeMastraServer(app);

  return app;
};

export const getApp = async () => {
  appPromise ??= buildApp();

  return appPromise;
};
