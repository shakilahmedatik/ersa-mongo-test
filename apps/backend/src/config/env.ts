export type AppEnv = {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
};

const validLogLevels = new Set<AppEnv["logLevel"]>([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
]);

const requireString = (name: string) => {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
};

const optionalString = (name: string, fallback: string) => {
  const value = process.env[name];

  return value && value.trim().length > 0 ? value.trim() : fallback;
};

const parsePort = (value: string, name: string) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
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

const parseLogLevel = (value: string): AppEnv["logLevel"] => {
  if (validLogLevels.has(value as AppEnv["logLevel"])) {
    return value as AppEnv["logLevel"];
  }

  throw new Error(
    `LOG_LEVEL must be one of: ${Array.from(validLogLevels).join(", ")}.`,
  );
};

const buildEnv = (): AppEnv => {
  return Object.freeze({
    nodeEnv: optionalString("NODE_ENV", "development"),
    port: parsePort(optionalString("PORT", "3001"), "PORT"),
    mongoUri: requireString("MONGODB_URI"),
    betterAuthSecret: requireString("BETTER_AUTH_SECRET"),
    betterAuthUrl: parseUrl(
      requireString("BETTER_AUTH_URL"),
      "BETTER_AUTH_URL",
    ),
    logLevel: parseLogLevel(optionalString("LOG_LEVEL", "info")),
  });
};

let cachedEnv: AppEnv | undefined;

export const getEnv = () => {
  cachedEnv ??= buildEnv();

  return cachedEnv;
};
