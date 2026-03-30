import { getEnv } from "../config/env";
import { getAuth } from "../infrastructure/auth/better-auth";
import {
  closeDatabases,
  connectDatabases,
  verifyDatabaseConnection,
} from "../infrastructure/database/mongo";
import { logger } from "../infrastructure/logging/logger";

const startupLogger = logger.child({ scope: "startup" });

declare global {
  var __ersaProcessHandlersRegistered: boolean | undefined;
}

const logFatalAndExit = async (error: unknown, message: string) => {
  startupLogger.fatal({ err: error }, message);

  try {
    await closeDatabases();
  } catch (shutdownError) {
    startupLogger.error(
      { err: shutdownError },
      "Failed to close database connections during shutdown",
    );
  }

  process.exit(1);
};

export const registerProcessHandlers = () => {
  if (globalThis.__ersaProcessHandlersRegistered) {
    return;
  }

  process.on("unhandledRejection", (reason) => {
    void logFatalAndExit(reason, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (error) => {
    void logFatalAndExit(error, "Uncaught exception");
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    startupLogger.info({ signal }, "Received shutdown signal");

    try {
      await closeDatabases();
      startupLogger.info("Shutdown completed");
      process.exit(0);
    } catch (error) {
      await logFatalAndExit(error, "Graceful shutdown failed");
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  globalThis.__ersaProcessHandlersRegistered = true;
};

export const bootstrapApplication = async () => {
  try {
    const env = getEnv();

    startupLogger.info(
      {
        nodeEnv: env.nodeEnv,
        port: env.port,
        logLevel: env.logLevel,
      },
      "Starting backend application",
    );

    await connectDatabases();
    await verifyDatabaseConnection();
    await getAuth();

    startupLogger.info("Database connections verified");
    startupLogger.info("Authentication service initialized");
    startupLogger.info({ port: env.port }, "Backend application started");
  } catch (error) {
    await logFatalAndExit(error, "Backend startup failed");
  }
};
