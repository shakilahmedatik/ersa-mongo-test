import { app } from "./app";
import { env } from "./config/env";
import { connectDatabases } from "./database/connections";
import { getAuth } from "./modules/auth/auth.instance";

const startup = Promise.all([connectDatabases(), getAuth()]);

export default {
  port: env.port,
  async fetch(request: Request) {
    await startup;

    return app.fetch(request);
  },
};
