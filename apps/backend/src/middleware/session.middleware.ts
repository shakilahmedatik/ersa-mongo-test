import type { MiddlewareHandler } from "hono";
import { authService } from "../modules/auth/auth.service";
import type { AppBindings } from "../types/app";

export const sessionMiddleware: MiddlewareHandler<AppBindings> = async (
  context,
  next,
) => {
  const session = await authService.getSession(context.req.raw.headers);

  context.set("session", session?.session ?? null);
  context.set("user", session?.user ?? null);

  await next();
};
