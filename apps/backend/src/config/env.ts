const requireString = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
};

const parsePort = (value: string) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  return parsed;
};

const parseUrl = (value: string, name: string) => {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }
};

export const env = Object.freeze({
  nodeEnv: requireString("NODE_ENV", "development"),
  port: parsePort(requireString("PORT", "3001")),
  mongoUri: requireString("MONGODB_URI", "mongodb://127.0.0.1:27017/ersa-chat"),
  betterAuthSecret: requireString(
    "BETTER_AUTH_SECRET",
    "dev-secret-change-this-before-production",
  ),
  betterAuthUrl: parseUrl(
    requireString("BETTER_AUTH_URL", "http://localhost:3001"),
    "BETTER_AUTH_URL",
  ),
});
