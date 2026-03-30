import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { getEnv } from "../../config/env";
import { createLogger } from "../logging/logger";

const logger = createLogger({ scope: "database" });

declare global {
  var __ersaMongoClientPromise: Promise<MongoClient> | undefined;
  var __ersaMongoosePromise: Promise<typeof mongoose> | undefined;
  var __ersaMongooseListenersRegistered: boolean | undefined;
}

const registerMongooseListeners = () => {
  if (globalThis.__ersaMongooseListenersRegistered) {
    return;
  }

  mongoose.connection.on("connected", () => {
    logger.info("Mongoose connected");
  });

  mongoose.connection.on("error", (error) => {
    logger.error({ err: error }, "Mongoose connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("Mongoose disconnected");
  });

  globalThis.__ersaMongooseListenersRegistered = true;
};

const ensureConnections = () => {
  const env = getEnv();

  registerMongooseListeners();

  globalThis.__ersaMongoClientPromise ??= new MongoClient(
    env.mongoUri,
  ).connect();
  globalThis.__ersaMongoosePromise ??= mongoose.connect(env.mongoUri);

  return {
    mongoClientPromise: globalThis.__ersaMongoClientPromise,
    mongoosePromise: globalThis.__ersaMongoosePromise,
  };
};

export const getMongoClient = async () => {
  const { mongoClientPromise } = ensureConnections();

  return mongoClientPromise;
};

export const getMongoDatabase = async () => {
  const client = await getMongoClient();

  return client.db();
};

export const connectDatabases = async () => {
  const { mongoClientPromise, mongoosePromise } = ensureConnections();

  await Promise.all([mongoClientPromise, mongoosePromise]);
};

export const verifyDatabaseConnection = async () => {
  const database = await getMongoDatabase();
  const pingResult = await database.command({ ping: 1 });

  if (pingResult.ok !== 1) {
    throw new Error("MongoDB ping failed.");
  }
};

export const closeDatabases = async () => {
  const mongoClientPromise = globalThis.__ersaMongoClientPromise;

  if (mongoClientPromise) {
    const mongoClientResult = await Promise.allSettled([mongoClientPromise]);

    if (mongoClientResult[0]?.status === "fulfilled") {
      await mongoClientResult[0].value.close();
    }
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
