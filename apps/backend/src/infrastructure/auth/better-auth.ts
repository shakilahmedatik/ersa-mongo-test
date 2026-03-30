import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getEnv } from "../../config/env";
import {
  connectDatabases,
  getMongoClient,
  getMongoDatabase,
} from "../database/mongo";

const createAuth = async () => {
  const env = getEnv();

  await connectDatabases();

  const [mongoClient, mongoDatabase] = await Promise.all([
    getMongoClient(),
    getMongoDatabase(),
  ]);

  return betterAuth({
    baseURL: env.betterAuthUrl,
    secret: env.betterAuthSecret,
    database: mongodbAdapter(mongoDatabase, {
      client: mongoClient,
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
    },
  });
};

type BetterAuthInstance = Awaited<ReturnType<typeof createAuth>>;

let authPromise: Promise<BetterAuthInstance> | undefined;

export const getAuth = async () => {
  authPromise ??= createAuth();

  return authPromise;
};
