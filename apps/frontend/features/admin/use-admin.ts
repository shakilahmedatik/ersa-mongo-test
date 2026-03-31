"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "./admin.api";

export const useAdminStatusQuery = (enabled: boolean) => {
  return useQuery({
    queryKey: ["admin", "status"],
    queryFn: adminApi.getStatus,
    enabled,
    retry: false,
  });
};
