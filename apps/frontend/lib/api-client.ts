import { publicEnv } from "@/config/public-env";

export const resolveApiUrl = (path: string) => {
  return new URL(path, publicEnv.apiBaseUrl).toString();
};

export const resolveApiError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string };

    if (typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }
  } catch {
    return `Request failed with status ${response.status}.`;
  }

  return `Request failed with status ${response.status}.`;
};
