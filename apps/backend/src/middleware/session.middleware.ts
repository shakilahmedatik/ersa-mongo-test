import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../app/bindings";
import { authService } from "../features/auth/auth.service";

export const sessionMiddleware: MiddlewareHandler<AppBindings> = async (
  context,
  next,
) => {
  const session = await authService.getSession(context.req.raw.headers);

  context.set("session", session?.session ?? null);
  context.set("user", session?.user ?? null);

  await next();
};
