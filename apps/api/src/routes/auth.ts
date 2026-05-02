import { z } from "zod";
import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import { bot } from "../telegram/bot.js";
import { getUserByTelegramId } from "../services/user-service.js";
import {
  buildStravaAuthUrl,
  createStravaAuthState,
  exchangeStravaCode,
  storeStravaConnection,
  syncStravaActivities,
} from "../strava/strava-service.js";

const startSchema = z.object({
  telegramId: z.string().min(1),
  format: z.enum(["json"]).optional(),
});

const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  scope: z.string().optional(),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/auth/strava/start", async (request, reply) => {
    const { telegramId, format } = startSchema.parse(request.query);
    const state = createStravaAuthState(telegramId);
    const url = buildStravaAuthUrl(
      {
        clientId: env.STRAVA_CLIENT_ID,
        clientSecret: env.STRAVA_CLIENT_SECRET,
        publicBaseUrl: env.PUBLIC_BASE_URL,
      },
      telegramId,
      state,
    );

    if (format === "json") {
      return { url, state };
    }

    return reply.redirect(url);
  });

  app.get("/auth/strava/callback", async (request) => {
    const { code, state, scope } = callbackSchema.parse(request.query);
    const telegramId = state.split(".")[0];
    if (!telegramId) {
      throw app.httpErrors.badRequest("Invalid state");
    }

    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      throw app.httpErrors.notFound("Telegram user not found");
    }

    const token = await exchangeStravaCode({
      code,
      config: {
        clientId: env.STRAVA_CLIENT_ID,
        clientSecret: env.STRAVA_CLIENT_SECRET,
        publicBaseUrl: env.PUBLIC_BASE_URL,
      },
    });

    await storeStravaConnection({
      userId: user.id,
      token,
      scope,
    });

    await syncStravaActivities({
      userId: user.id,
      config: {
        clientId: env.STRAVA_CLIENT_ID,
        clientSecret: env.STRAVA_CLIENT_SECRET,
        publicBaseUrl: env.PUBLIC_BASE_URL,
      },
      days: 90,
    });

    await bot.api.sendMessage(Number(telegramId), "Strava connected successfully. Initial activity sync completed.");

    return { ok: true };
  });
}
