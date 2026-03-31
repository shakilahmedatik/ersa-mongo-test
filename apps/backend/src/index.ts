import { getApp } from "./app/app";
import { bootstrapApplication, registerProcessHandlers } from "./app/bootstrap";
import { getEnv } from "./config/env";

registerProcessHandlers();
await bootstrapApplication();

const env = getEnv();
const app = await getApp();

export default {
  port: env.port,
  idleTimeout: 255,
  fetch(request: Request) {
    return app.fetch(request);
  },
};
