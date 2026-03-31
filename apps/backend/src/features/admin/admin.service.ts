import { getEnv } from "../../config/env";
import type { AdminStatus, AdminUser } from "./admin.types";

const normalizeEmail = (email: string) => {
  return email.trim().toLowerCase();
};

export const adminService = {
  isAdminEmail(email: string) {
    const env = getEnv();

    return env.adminEmails.includes(normalizeEmail(email));
  },

  isAdminUser(user: AdminUser) {
    return this.isAdminEmail(user.email);
  },

  getStatus(user: AdminUser): AdminStatus {
    return {
      email: user.email,
      isAdmin: this.isAdminUser(user),
    };
  },
};
