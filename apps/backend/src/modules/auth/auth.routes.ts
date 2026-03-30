import { Hono } from "hono";
import type { AppBindings } from "../../types/app";
import { authService } from "./auth.service";
import { parseLoginInput, parseSignUpInput } from "./auth.validation";

export const authRoutes = new Hono<AppBindings>();

authRoutes.post("/signup", async (context) => {
  const payload = parseSignUpInput(await context.req.json());

  if (!payload) {
    return context.json(
      {
        error: "name, email, and password are required",
      },
      400,
    );
  }

  return authService.signUp(context.req.raw, payload);
});

authRoutes.post("/login", async (context) => {
  const payload = parseLoginInput(await context.req.json());

  if (!payload) {
    return context.json(
      {
        error: "email and password are required",
      },
      400,
    );
  }

  return authService.login(context.req.raw, payload);
});

authRoutes.post("/logout", async (context) => {
  return authService.logout(context.req.raw);
});

authRoutes.get("/session", async (context) => {
  const session = context.get("session");
  const user = context.get("user");

  if (!session || !user) {
    return context.json({
      session: null,
      user: null,
      profile: null,
    });
  }

  const currentSession = await authService.getCurrentSession(user.id, {
    session,
    user,
  });

  return context.json(currentSession);
});
