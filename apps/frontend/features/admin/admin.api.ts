import { resolveApiError, resolveApiUrl } from "@/lib/api-client";
import type { AdminStatus } from "./admin.types";

export const adminApi = {
  async getStatus() {
    const response = await fetch(resolveApiUrl("/admin/me"), {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as AdminStatus;
  },
};
