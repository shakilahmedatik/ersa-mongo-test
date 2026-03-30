import type { LoginInput, SignUpInput } from "./auth.types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const getRequiredString = (
  value: Record<string, unknown>,
  key: string,
): string | null => {
  const candidate = value[key];

  if (typeof candidate !== "string") {
    return null;
  }

  const normalized = candidate.trim();

  return normalized.length > 0 ? normalized : null;
};

const assertEmail = (email: string) => {
  return EMAIL_PATTERN.test(email);
};

export const parseSignUpInput = (value: unknown): SignUpInput | null => {
  if (!isRecord(value)) {
    return null;
  }

  const name = getRequiredString(value, "name");
  const email = getRequiredString(value, "email");
  const password = getRequiredString(value, "password");

  if (!name || !email || !password || !assertEmail(email)) {
    return null;
  }

  return {
    name,
    email: email.toLowerCase(),
    password,
  };
};

export const parseLoginInput = (value: unknown): LoginInput | null => {
  if (!isRecord(value)) {
    return null;
  }

  const email = getRequiredString(value, "email");
  const password = getRequiredString(value, "password");

  if (!email || !password || !assertEmail(email)) {
    return null;
  }

  return {
    email: email.toLowerCase(),
    password,
  };
};
