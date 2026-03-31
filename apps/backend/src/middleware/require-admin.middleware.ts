import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../app/bindings";
import { adminService } from "../features/admin/admin.service";

export const requireAdminMiddleware: MiddlewareHandler<AppBindings> = async (
  context,
  next,
) => {
  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  if (!adminService.isAdminUser(user)) {
    return context.json(
      {
        error: "Admin access required",
      },
      403,
    );
  }

  await next();
};
