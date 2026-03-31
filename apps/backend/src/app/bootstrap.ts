import { getEnv } from "../config/env";
import {
  runKnowledgeIngestionNow,
  startKnowledgeIngestionWorker,
  stopKnowledgeIngestionWorker,
} from "../features/knowledge/knowledge.ingestion";
import { knowledgeSearch } from "../features/knowledge/knowledge.search";
import {
  closeMastraStorage,
  initializeMastraStorage,
} from "../infrastructure/ai/mastra/chat.memory";
import { getAuth } from "../infrastructure/auth/better-auth";
import {
  closeDatabases,
  connectDatabases,
  verifyDatabaseConnection,
} from "../infrastructure/database/mongo";
import { logger } from "../infrastructure/logging/logger";
import { getApp } from "./app";

const startupLogger = logger.child({ scope: "startup" });

declare global {
  var __ersaProcessHandlersRegistered: boolean | undefined;
}

const shutdownSteps = [
  {
    name: "Mastra storage",
    run: closeMastraStorage,
  },
  {
    name: "Knowledge search",
    run: () => knowledgeSearch.close(),
  },
  {
    name: "Knowledge ingestion worker",
    run: async () => {
      stopKnowledgeIngestionWorker();
    },
  },
  {
    name: "Database connections",
    run: closeDatabases,
  },
];

const runShutdownSteps = async () => {
  let success = true;

  for (const step of shutdownSteps) {
    try {
      await step.run();
    } catch (error) {
      success = false;
      startupLogger.error(
        { err: error },
        `Failed to close ${step.name.toLowerCase()} during shutdown`,
      );
    }
  }

  return success;
};

const exitWithFailure = async (error: unknown, message: string) => {
  startupLogger.fatal({ err: error }, message);
  await runShutdownSteps();
  process.exit(1);
};

const initializeKnowledge = async () => {
  const knowledgeIndex = await knowledgeSearch.initialize();
  startKnowledgeIngestionWorker();

  if (!knowledgeIndex.recreated) {
    return;
  }

  const job = await runKnowledgeIngestionNow({
    kind: "full",
    triggeredBy: "startup",
  });

  startupLogger.info(
    {
      jobId: job?.id,
      status: job?.status,
    },
    "Knowledge vectors rebuilt after index recreation",
  );
};

const startupSteps = [
  {
    message: "Database connections verified",
    run: async () => {
      await connectDatabases();
      await verifyDatabaseConnection();
    },
  },
  {
    message: "Knowledge search initialized",
    run: initializeKnowledge,
  },
  {
    message: "Mastra storage initialized",
    run: initializeMastraStorage,
  },
  {
    message: "Authentication service initialized",
    run: getAuth,
  },
  {
    message: "Mastra server initialized",
    run: getApp,
  },
];

const shutdown = async (signal: NodeJS.Signals) => {
  startupLogger.info({ signal }, "Received shutdown signal");

  if (await runShutdownSteps()) {
    startupLogger.info("Shutdown completed");
    process.exit(0);
  }

  process.exit(1);
};

export const registerProcessHandlers = () => {
  if (globalThis.__ersaProcessHandlersRegistered) {
    return;
  }

  process.on("unhandledRejection", (reason) => {
    void exitWithFailure(reason, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (error) => {
    void exitWithFailure(error, "Uncaught exception");
  });

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

    for (const step of startupSteps) {
      await step.run();
      startupLogger.info(step.message);
    }

    startupLogger.info({ port: env.port }, "Backend application started");
  } catch (error) {
    await exitWithFailure(error, "Backend startup failed");
  }
};
