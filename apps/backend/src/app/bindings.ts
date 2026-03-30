import type pino from "pino";
import type { AuthUser, SessionData } from "../features/auth/auth.types";

export type AppBindings = {
  Variables: {
    logger: pino.Logger;
    requestId: string;
    session: SessionData | null;
    user: AuthUser | null;
  };
};
