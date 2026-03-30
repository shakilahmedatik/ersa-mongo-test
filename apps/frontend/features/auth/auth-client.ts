import { createAuthClient } from "better-auth/react";
import { publicEnv } from "@/config/public-env";

export const authClient = createAuthClient({
  baseURL: publicEnv.apiBaseUrl,
});
