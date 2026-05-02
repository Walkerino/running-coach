import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import { bot } from "../telegram/bot.js";

export async function registerTelegramRoutes(app: FastifyInstance) {
  app.post("/telegram/webhook", async (request, reply) => {
    const secret = request.headers["x-telegram-bot-api-secret-token"];
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw app.httpErrors.unauthorized("Invalid Telegram webhook secret");
    }

    await bot.handleUpdate(request.body as never);
    reply.code(200);
    return { ok: true };
  });
}
