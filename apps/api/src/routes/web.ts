import { z } from "zod";
import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import { runAgent } from "../agent/agent-service.js";
import { getRecentConversation, saveConversationMessage } from "../services/conversation-service.js";
import {
  deleteTrainingPlanCompletion,
  getTrainingPlanOverride,
  getWebHealthSnapshot,
  resolveUser,
  setTrainingPlanCompletion,
  setTrainingPlanOverride,
  updateWebHrZones,
} from "../health/web-snapshot-service.js";

const userQuerySchema = z.object({
  userId: z.string().optional(),
  telegramId: z.string().optional(),
});

const zoneSchema = z.object({
  min: z.number().int().min(30).max(240),
  max: z.number().int().min(30).max(240),
});

const hrZonesBodySchema = z.object({
  userId: z.string().optional(),
  telegramId: z.string().optional(),
  hrZones: z.object({
    z1: zoneSchema,
    z2: zoneSchema,
    z3: zoneSchema,
    z4: zoneSchema,
    z5: zoneSchema,
  }),
});

const completionBodySchema = z.object({
  userId: z.string().optional(),
  telegramId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workoutType: z.string().min(1),
  title: z.string().optional(),
});

const planOverrideQuerySchema = userQuerySchema.extend({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const trainingPlanDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayName: z.string().min(1),
  workoutType: z.string().min(1),
  title: z.string().min(1),
  durationMinutes: z.number().int().positive().optional(),
  distanceKm: z.number().positive().optional(),
  targetZone: z.string().optional(),
  targetHrRange: z.string().optional(),
  description: z.string().min(1),
  coachNote: z.string().min(1),
  status: z.enum(["ready", "adjust", "skip", "completed"]),
});

const planOverrideBodySchema = z.object({
  userId: z.string().optional(),
  telegramId: z.string().optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.array(trainingPlanDaySchema).length(7),
  rationale: z.array(z.string()).default([]),
  source: z.string().optional(),
});

const chatBodySchema = z.object({
  userId: z.string().optional(),
  telegramId: z.string().optional(),
  message: z.string().trim().min(1).max(4000),
});

function verifyAdmin(request: { headers: Record<string, unknown> }) {
  return request.headers["x-admin-api-key"] === env.ADMIN_API_KEY;
}

function validateZoneOrder(hrZones: z.infer<typeof hrZonesBodySchema>["hrZones"]) {
  const zones = [hrZones.z1, hrZones.z2, hrZones.z3, hrZones.z4, hrZones.z5];
  for (const zone of zones) {
    if (zone.min >= zone.max) return false;
  }
  for (let index = 1; index < zones.length; index += 1) {
    if (zones[index].min < zones[index - 1].max) return false;
  }
  return true;
}

export async function registerWebRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    if (request.url.startsWith("/web") && !verifyAdmin(request)) {
      throw app.httpErrors.unauthorized("Invalid admin API key");
    }
  });

  app.get("/web/health-snapshot", async (request) => {
    const query = userQuerySchema.parse(request.query);
    const snapshot = await getWebHealthSnapshot(query);

    if (!snapshot) {
      throw app.httpErrors.notFound("User not found. Provide userId or telegramId when the database has multiple users.");
    }

    return snapshot;
  });

  app.get("/web/chat/messages", async (request) => {
    const query = userQuerySchema.parse(request.query);
    const user = await resolveUser(query);
    if (!user) {
      throw app.httpErrors.notFound("User not found. Provide userId or telegramId when the database has multiple users.");
    }

    const messages = await getRecentConversation(user.id, 20);
    return {
      messages: messages
        .filter((message: (typeof messages)[number]) => message.role === "user" || message.role === "assistant")
        .map((message: (typeof messages)[number]) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        })),
    };
  });

  app.post("/web/chat", async (request) => {
    const body = chatBodySchema.parse(request.body);
    const user = await resolveUser(body);
    if (!user) {
      throw app.httpErrors.notFound("User not found. Provide userId or telegramId when the database has multiple users.");
    }

    const answer = await runAgent({
      userId: user.id,
      message: body.message,
    });

    await saveConversationMessage({
      userId: user.id,
      role: "user",
      content: body.message,
      metadataJson: { surface: "web" },
    });
    const assistantMessage = await saveConversationMessage({
      userId: user.id,
      role: "assistant",
      content: answer,
      metadataJson: { surface: "web" },
    });

    return {
      answer,
      message: {
        id: assistantMessage.id,
        role: "assistant",
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
    };
  });

  app.patch("/web/settings/hr-zones", async (request) => {
    const body = hrZonesBodySchema.parse(request.body);
    if (!validateZoneOrder(body.hrZones)) {
      throw app.httpErrors.badRequest("Invalid heart-rate zone order");
    }

    const user = await updateWebHrZones(body);
    if (!user) {
      throw app.httpErrors.notFound("User not found");
    }

    return { ok: true };
  });

  app.post("/web/training-completions", async (request) => {
    const body = completionBodySchema.parse(request.body);
    const completion = await setTrainingPlanCompletion(body);
    if (!completion) {
      throw app.httpErrors.notFound("User not found");
    }

    return { ok: true };
  });

  app.delete("/web/training-completions", async (request) => {
    const body = completionBodySchema.parse(request.body);
    const result = await deleteTrainingPlanCompletion(body);
    if (!result) {
      throw app.httpErrors.notFound("User not found");
    }

    return result;
  });

  app.get("/web/training-plan-override", async (request) => {
    const query = planOverrideQuerySchema.parse(request.query);
    const override = await getTrainingPlanOverride(query);
    if (!override) {
      throw app.httpErrors.notFound("Training plan override not found");
    }

    return override;
  });

  app.post("/web/training-plan-override", async (request) => {
    const body = planOverrideBodySchema.parse(request.body);
    const override = await setTrainingPlanOverride(body);
    if (!override) {
      throw app.httpErrors.notFound("User not found");
    }

    return override;
  });
}
