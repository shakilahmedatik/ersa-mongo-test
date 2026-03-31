import { Hono } from "hono";
import type { AppBindings } from "../../app/bindings";
import { requireUserMiddleware } from "../../middleware/require-user.middleware";
import { knowledgeAdminRoutes } from "../knowledge/knowledge.admin.routes";
import { adminService } from "./admin.service";

export const adminRoutes = new Hono<AppBindings>();

adminRoutes.use("*", requireUserMiddleware);

adminRoutes.get("/me", (context) => {
  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  return context.json(adminService.getStatus(user));
});

adminRoutes.route("/knowledge", knowledgeAdminRoutes);
