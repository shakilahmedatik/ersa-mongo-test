import { MastraServer } from "@mastra/hono";
import type { Hono } from "hono";
import type { AppBindings } from "../../../app/bindings";
import { logger } from "../../logging/logger";
import { getMastra } from "./mastra";

const mastraLogger = logger.child({ scope: "mastra" });
export const mastraApiPrefix = "/api/mastra";
let serverInitialized = false;

export const initializeMastraServer = async (app: Hono<AppBindings>) => {
  if (serverInitialized) {
    return;
  }

  const server = new MastraServer({
    app,
    mastra: getMastra(),
    prefix: mastraApiPrefix,
  });

  await server.init();
  serverInitialized = true;

  mastraLogger.info({ prefix: mastraApiPrefix }, "Mastra server initialized");
};
