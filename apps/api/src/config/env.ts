import { existsSync } from "node:fs";
import { resolve } from "node:path";

import dotenv from "dotenv";
import { z } from "zod";

for (const envPath of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false, quiet: true });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  TELEGRAM_USE_POLLING: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z.string().min(1).default("google/gemini-2.5-flash-lite-preview-09-2025"),
  OPENROUTER_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  OPENROUTER_MAX_TOKENS: z.coerce.number().int().positive().default(450),
  STRAVA_CLIENT_ID: z.string().min(1),
  STRAVA_CLIENT_SECRET: z.string().min(1),
  STRAVA_VERIFY_TOKEN: z.string().min(1),
  HEALTH_EXPORT_API_KEY: z.string().optional().default(""),
  ENCRYPTION_KEY: z.string().min(32),
  ADMIN_API_KEY: z.string().min(1),
  APP_TIMEZONE: z.string().default("Europe/Helsinki"),
  LOG_AI_MESSAGES: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value === "true"),
});

export const env = envSchema.parse(process.env);

export type Env = typeof env;
