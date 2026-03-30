import pino from "pino";

type LoggerLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

const validLogLevels = new Set<LoggerLevel>([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
] as const);

const resolveLogLevel = () => {
  const value = process.env.LOG_LEVEL?.trim();

  if (value && validLogLevels.has(value as LoggerLevel)) {
    return value as LoggerLevel;
  }

  return "info" satisfies LoggerLevel;
};

export const logger = pino({
  name: "ersa-chat-backend",
  level: resolveLogLevel(),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      service: "backend",
    }),
  },
});

export const createLogger = (bindings: pino.Bindings) => logger.child(bindings);
