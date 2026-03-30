import { Hono } from "hono";
import { sessionMiddleware } from "./middleware/session.middleware";
import { authRoutes } from "./modules/auth/auth.routes";
import { authService } from "./modules/auth/auth.service";
import type { AppBindings } from "./types/app";

export const app = new Hono<AppBindings>();

app.use("*", sessionMiddleware);

app.get("/", (context) => {
  return context.json({
    message: "Backend authentication server is running",
  });
});

app.route("/auth", authRoutes);

app.on(["GET", "POST"], "/api/auth/*", (context) => {
  return authService.handleBetterAuth(context.req.raw);
});
