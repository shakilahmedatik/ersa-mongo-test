import { Memory } from "@mastra/memory";
import { MongoDBStore } from "@mastra/mongodb";
import { getEnv } from "../../../config/env";

declare global {
  var __ersaMastraMongoStore: MongoDBStore | undefined;
  var __ersaChatMemory: Memory | undefined;
}

const workingMemoryTemplate = `
# User Profile

- Preferred name:
- Primary goals:
- Product interests:
- Communication preferences:
- Open tasks or follow-ups:
`.trim();

const createMastraStorage = () => {
  const env = getEnv();

  return new MongoDBStore({
    id: "ersa-chat-mastra-storage",
    uri: env.mongoUri,
    dbName: env.mongoDbName,
  });
};

export const getMastraStorage = () => {
  globalThis.__ersaMastraMongoStore ??= createMastraStorage();

  return globalThis.__ersaMastraMongoStore;
};

export const getChatMemory = () => {
  globalThis.__ersaChatMemory ??= new Memory({
    storage: getMastraStorage(),
    options: {
      generateTitle: true,
      workingMemory: {
        enabled: true,
        scope: "resource",
        template: workingMemoryTemplate,
      },
    },
  });

  return globalThis.__ersaChatMemory;
};

export const initializeMastraStorage = async () => {
  const storage = getMastraStorage();

  await storage.init();
};

export const closeMastraStorage = async () => {
  const storage = globalThis.__ersaMastraMongoStore;

  if (!storage) {
    return;
  }

  await storage.close();
};
