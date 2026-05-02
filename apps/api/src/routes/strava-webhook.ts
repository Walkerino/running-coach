import { z } from "zod";
import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { enqueueJob } from "../services/job-service.js";
import { markStravaActivityDeleted } from "../strava/strava-service.js";

const stravaChallengeSchema = z.object({
  "hub.mode": z.string(),
  "hub.challenge": z.string(),
  "hub.verify_token": z.string(),
});

const stravaWebhookSchema = z.object({
  aspect_type: z.enum(["create", "update", "delete"]),
  object_type: z.string(),
  object_id: z.number(),
  owner_id: z.number(),
  updates: z.record(z.string(), z.unknown()).optional(),
});

export async function registerStravaWebhookRoutes(app: FastifyInstance) {
  app.get("/webhooks/strava", async (request) => {
    const query = stravaChallengeSchema.parse(request.query);
    if (query["hub.verify_token"] !== env.STRAVA_VERIFY_TOKEN) {
      throw app.httpErrors.forbidden("Invalid verify token");
    }

    return { "hub.challenge": query["hub.challenge"] };
  });

  app.post("/webhooks/strava", async (request, reply) => {
    const body = stravaWebhookSchema.parse(request.body);
    reply.code(200);
    void reply.send({ ok: true });

    if (body.object_type !== "activity") {
      return;
    }

    const connection = await prisma.stravaConnection.findFirst({
      where: { athleteId: String(body.owner_id) },
    });

    if (!connection) {
      return;
    }

    if (body.aspect_type === "delete") {
      await markStravaActivityDeleted(String(body.object_id));
      return;
    }

    await enqueueJob("strava.sync.single", {
      userId: connection.userId,
      activityId: String(body.object_id),
      updates: body.updates ?? {},
    });
  });
}
