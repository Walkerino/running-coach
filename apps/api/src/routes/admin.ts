import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import { buildUserSummary } from "../services/summary-service.js";
import { syncStravaActivities } from "../strava/strava-service.js";
import { calculateReadiness } from "../training/readiness-service.js";

function verifyAdmin(request: { headers: Record<string, unknown> }) {
  return request.headers["x-admin-api-key"] === env.ADMIN_API_KEY;
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    if (request.url.startsWith("/admin") && !verifyAdmin(request)) {
      throw app.httpErrors.unauthorized("Invalid admin API key");
    }
  });

  app.post("/admin/sync/strava/:userId", async (request) => {
    const userId = (request.params as { userId: string }).userId;
    return syncStravaActivities({
      userId,
      config: {
        clientId: env.STRAVA_CLIENT_ID,
        clientSecret: env.STRAVA_CLIENT_SECRET,
        publicBaseUrl: env.PUBLIC_BASE_URL,
      },
    });
  });

  app.post("/admin/calculate-readiness/:userId", async (request) => {
    const userId = (request.params as { userId: string }).userId;
    return calculateReadiness(userId);
  });

  app.get("/admin/user/:userId/summary", async (request) => {
    const userId = (request.params as { userId: string }).userId;
    return buildUserSummary(userId);
  });
}
