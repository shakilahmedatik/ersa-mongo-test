export type AppEnv = {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  mongoDbName: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  betterAuthCrossSiteCookies: boolean;
  corsOrigins: string[];
  adminEmails: string[];
  googleGenerativeAiApiKey: string;
  openRouterApiKey: string;
  assistantModel: string;
  knowledgeEmbeddingModel: string;
  knowledgeEmbeddingDimensions: number;
  knowledgeVectorIndexName: string;
  chatRateLimitWindowSeconds: number;
  chatRateLimitMaxRequests: number;
  chatMemoryLastMessages: number;
  chatCompletionMaxTokens: number;
  knowledgeIngestionStaleAfterMs: number;
  knowledgeIngestionProgressFlushEveryDocs: number;
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

const parsePositiveInteger = (value: string, name: string) => {
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

const parseOriginList = (value: string, name: string) => {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => parseUrl(origin, name));

  if (origins.length === 0) {
    throw new Error(`${name} must contain at least one valid origin.`);
  }

  return origins;
};

const parseEmailList = (value: string, name: string) => {
  const emails = value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    throw new Error(`${name} must contain at least one email address.`);
  }

  return emails;
};

const parseLogLevel = (value: string): AppEnv["logLevel"] => {
  if (validLogLevels.has(value as AppEnv["logLevel"])) {
    return value as AppEnv["logLevel"];
  }

  throw new Error(
    `LOG_LEVEL must be one of: ${Array.from(validLogLevels).join(", ")}.`,
  );
};

const parseBoolean = (value: string, name: string) => {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${name} must be either "true" or "false".`);
};

const buildEnv = (): AppEnv => {
  return Object.freeze({
    nodeEnv: optionalString("NODE_ENV", "development"),
    port: parsePort(optionalString("PORT", "3001"), "PORT"),
    mongoUri: requireString("MONGODB_URI"),
    mongoDbName: requireString("MONGODB_DB_NAME"),
    betterAuthSecret: requireString("BETTER_AUTH_SECRET"),
    betterAuthUrl: parseUrl(
      requireString("BETTER_AUTH_URL"),
      "BETTER_AUTH_URL",
    ),
    betterAuthCrossSiteCookies: parseBoolean(
      optionalString("BETTER_AUTH_CROSS_SITE_COOKIES", "false"),
      "BETTER_AUTH_CROSS_SITE_COOKIES",
    ),
    corsOrigins: parseOriginList(requireString("CORS_ORIGINS"), "CORS_ORIGINS"),
    adminEmails: parseEmailList(requireString("ADMIN_EMAILS"), "ADMIN_EMAILS"),
    googleGenerativeAiApiKey: requireString("GOOGLE_GENERATIVE_AI_API_KEY"),
    openRouterApiKey: requireString("OPENROUTER_API_KEY"),
    assistantModel: requireString("MASTRA_ASSISTANT_MODEL"),
    knowledgeEmbeddingModel: optionalString(
      "KNOWLEDGE_EMBEDDING_MODEL",
      "google/gemini-embedding-001",
    ),
    knowledgeEmbeddingDimensions: parsePositiveInteger(
      optionalString("KNOWLEDGE_EMBEDDING_DIMENSIONS", "3072"),
      "KNOWLEDGE_EMBEDDING_DIMENSIONS",
    ),
    knowledgeVectorIndexName: optionalString(
      "KNOWLEDGE_VECTOR_INDEX_NAME",
      "knowledge_base_embeddings",
    ),
    chatRateLimitWindowSeconds: parsePositiveInteger(
      optionalString("CHAT_RATE_LIMIT_WINDOW_SECONDS", "3600"),
      "CHAT_RATE_LIMIT_WINDOW_SECONDS",
    ),
    chatRateLimitMaxRequests: parsePositiveInteger(
      optionalString("CHAT_RATE_LIMIT_MAX_REQUESTS", "30"),
      "CHAT_RATE_LIMIT_MAX_REQUESTS",
    ),
    chatMemoryLastMessages: parsePositiveInteger(
      optionalString("CHAT_MEMORY_LAST_MESSAGES", "24"),
      "CHAT_MEMORY_LAST_MESSAGES",
    ),
    chatCompletionMaxTokens: parsePositiveInteger(
      optionalString("CHAT_COMPLETION_MAX_TOKENS", "2048"),
      "CHAT_COMPLETION_MAX_TOKENS",
    ),
    knowledgeIngestionStaleAfterMs: parsePositiveInteger(
      optionalString("KNOWLEDGE_INGESTION_STALE_AFTER_MS", "60000"),
      "KNOWLEDGE_INGESTION_STALE_AFTER_MS",
    ),
    knowledgeIngestionProgressFlushEveryDocs: parsePositiveInteger(
      optionalString("KNOWLEDGE_INGESTION_PROGRESS_FLUSH_EVERY_DOCS", "5"),
      "KNOWLEDGE_INGESTION_PROGRESS_FLUSH_EVERY_DOCS",
    ),
    logLevel: parseLogLevel(optionalString("LOG_LEVEL", "info")),
  });
};

let cachedEnv: AppEnv | undefined;

export const getEnv = () => {
  cachedEnv ??= buildEnv();

  return cachedEnv;
};
