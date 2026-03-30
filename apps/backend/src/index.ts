import { app } from "./app/app";
import { bootstrapApplication, registerProcessHandlers } from "./app/bootstrap";
import { getEnv } from "./config/env";

registerProcessHandlers();
await bootstrapApplication();

const env = getEnv();

export default {
  port: env.port,
  fetch(request: Request) {
    return app.fetch(request);
  },
};
