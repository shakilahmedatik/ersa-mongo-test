import type { AuthUser, SessionData } from "../modules/auth/auth.types";

export type AppBindings = {
  Variables: {
    session: SessionData | null;
    user: AuthUser | null;
  };
};
