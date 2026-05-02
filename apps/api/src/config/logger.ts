import pino from "pino";

import { env } from "./env.js";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.x-telegram-bot-api-secret-token",
  "response.body.access_token",
  "response.body.refresh_token",
  "*.accessTokenEncrypted",
  "*.refreshTokenEncrypted",
  "*.healthExportToken",
  "*.rawJson",
];

export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        }
      : undefined,
  redact: {
    paths: redactPaths,
    remove: env.NODE_ENV === "production",
  },
});
