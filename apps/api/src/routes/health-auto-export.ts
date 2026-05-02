import { z } from "zod";
import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { ingestHealthPayload } from "../health/health-service.js";

const tokenParamsSchema = z.object({
  token: z.string().min(1),
});

function hasGlobalToken(request: { headers: Record<string, unknown> }) {
  const authorization = request.headers.authorization;
  return authorization === `Bearer ${env.HEALTH_EXPORT_API_KEY}`;
}

export async function registerHealthAutoExportRoutes(app: FastifyInstance) {
  app.post("/webhooks/health-auto-export", async (request) => {
    if (!hasGlobalToken(request)) {
      throw app.httpErrors.unauthorized("Invalid health export token");
    }

    const telegramId = String((request.body as Record<string, unknown>)?.telegramId ?? "");
    const user = telegramId
      ? await prisma.user.findUnique({ where: { telegramId } })
      : null;

    if (!user) {
      throw app.httpErrors.badRequest("telegramId is required for the shared endpoint");
    }

    const parsed = await ingestHealthPayload({
      userId: user.id,
      payload: request.body,
    });

    request.log.info(
      {
        userId: user.id,
        dailyCount: parsed.daily.length,
        workoutCount: parsed.workouts.length,
        metricSampleCount: parsed.metricSamples.length,
      },
      "Health Auto Export payload ingested",
    );

    return { ok: true, dailyCount: parsed.daily.length, workoutCount: parsed.workouts.length };
  });

  app.post("/webhooks/health-auto-export/:token", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const user = await prisma.user.findUnique({
      where: { healthExportToken: token },
    });

    if (!user) {
      throw app.httpErrors.notFound("Health export token not found");
    }

    const parsed = await ingestHealthPayload({
      userId: user.id,
      payload: request.body,
    });

    request.log.info(
      {
        userId: user.id,
        dailyCount: parsed.daily.length,
        workoutCount: parsed.workouts.length,
        metricSampleCount: parsed.metricSamples.length,
      },
      "Health Auto Export payload ingested",
    );

    return { ok: true, dailyCount: parsed.daily.length, workoutCount: parsed.workouts.length };
  });
}
