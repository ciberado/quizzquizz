import { mkdirSync } from "node:fs";
import path from "node:path";

import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const {
  combine,
  colorize,
  errors,
  splat,
  timestamp,
  printf,
  json,
} = format;

const logLevel = process.env.LOG_LEVEL ?? "info";
const logDir = process.env.LOG_DIR ?? path.resolve(process.cwd(), "packages", "question-bank-builder", "logs");
const maxFiles = process.env.LOG_MAX_FILES ?? "14d";

try {
  mkdirSync(logDir, { recursive: true });
} catch {
  // ignore directory creation errors; logging will surface if it fails later
}

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp(),
  errors({ stack: true }),
  splat(),
  printf(({ level, message, timestamp: time, stack, ...meta }) => {
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${time} ${level}: ${stack ?? message}${metaString}`;
  })
);

const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json()
);

export const logger = createLogger({
  level: logLevel,
  transports: [
    new transports.Console({
      format: consoleFormat,
    }),
    new DailyRotateFile({
      dirname: logDir,
      filename: "question-bank-builder-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: false,
      maxFiles,
      format: fileFormat,
    }),
  ],
});

export function setLogLevel(level: string): void {
  logger.level = level;
  logger.transports.forEach((transport) => {
    transport.level = level;
  });
}
