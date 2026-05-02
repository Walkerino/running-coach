import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./db/prisma.js";
import { startJobRunner } from "./jobs/runner.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerHealthAutoExportRoutes } from "./routes/health-auto-export.js";
import { registerStravaWebhookRoutes } from "./routes/strava-webhook.js";
import { registerTelegramRoutes } from "./routes/telegram.js";
import { bot } from "./telegram/bot.js";

const app = Fastify({
  loggerInstance: logger as never,
  bodyLimit: 10 * 1024 * 1024,
}) as any;

await app.register(sensible);
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

await registerHealthRoutes(app);
await registerTelegramRoutes(app);
await registerAuthRoutes(app);
await registerStravaWebhookRoutes(app);
await registerHealthAutoExportRoutes(app);
await registerAdminRoutes(app);

app.setErrorHandler((error: unknown, _request: any, reply: any) => {
  app.log.error({ err: error }, "Request failed");
  const statusCode =
    typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : 500;
  reply.status(statusCode).send({
    error: error instanceof Error ? error.message : "Unknown error",
  });
});

const stopJobRunner = startJobRunner(env);

if (env.TELEGRAM_USE_POLLING) {
  await bot.api.deleteWebhook({ drop_pending_updates: false });
  void bot.start({
    allowed_updates: ["message"],
    onStart: ({ username }) => {
      logger.info({ username }, "Telegram bot started in polling mode");
    },
  });
}

const close = async () => {
  stopJobRunner();
  if (env.TELEGRAM_USE_POLLING) {
    await bot.stop();
  }
  await prisma.$disconnect();
  await app.close();
};

process.on("SIGINT", () => void close());
process.on("SIGTERM", () => void close());

await app.listen({
  port: env.PORT,
  host: "0.0.0.0",
});
