import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { env } from "../config/env";

declare global {
  var __ersaMongoClientPromise: Promise<MongoClient> | undefined;
  var __ersaMongoosePromise: Promise<typeof mongoose> | undefined;
}

const mongoClientPromise =
  globalThis.__ersaMongoClientPromise ??
  new MongoClient(env.mongoUri).connect();

const mongoosePromise =
  globalThis.__ersaMongoosePromise ?? mongoose.connect(env.mongoUri);

globalThis.__ersaMongoClientPromise = mongoClientPromise;
globalThis.__ersaMongoosePromise = mongoosePromise;

export const getMongoClient = () => mongoClientPromise;

export const getMongoDatabase = async () => {
  const client = await getMongoClient();

  return client.db();
};

export const connectDatabases = async () => {
  await Promise.all([mongoClientPromise, mongoosePromise]);
};
