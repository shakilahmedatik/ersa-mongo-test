import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../app/bindings";

export const requireUserMiddleware: MiddlewareHandler<AppBindings> = async (
  context,
  next,
) => {
  const session = context.get("session");
  const user = context.get("user");

  if (!session || !user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  await next();
};
