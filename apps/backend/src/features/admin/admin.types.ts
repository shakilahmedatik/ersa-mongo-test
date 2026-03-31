import type { AuthUser } from "../auth/auth.types";

export type AdminStatus = {
  email: string;
  isAdmin: boolean;
};

export type AdminUser = AuthUser;
