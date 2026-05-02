import { createHash } from "node:crypto";

import { prisma } from "../db/prisma.js";
import { parseHealthPayload } from "./parser.js";

function metricFingerprint(userId: string, metricName: string, rawJson: unknown) {
  return createHash("sha256")
    .update(userId)
    .update(metricName)
    .update(JSON.stringify(rawJson))
    .digest("hex");
}

function topLevelKeys(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  return Object.keys(payload as Record<string, unknown>).slice(0, 50);
}

export async function ingestHealthPayload(input: {
  userId: string;
  payload: unknown;
}) {
  const parsed = parseHealthPayload(input.payload);

  await prisma.healthPayloadImport.create({
    data: {
      userId: input.userId,
      dailyCount: parsed.daily.length,
      workoutCount: parsed.workouts.length,
      metricSampleCount: parsed.metricSamples.length,
      topLevelKeys: topLevelKeys(input.payload),
      rawJson: input.payload as never,
    },
  });

  for (const sample of parsed.metricSamples) {
    await prisma.healthMetricSample.upsert({
      where: {
        fingerprint: metricFingerprint(input.userId, sample.metricName, sample.rawJson),
      },
      update: {
        date: sample.date,
        units: sample.units,
        qty: sample.qty,
        min: sample.min,
        avg: sample.avg,
        max: sample.max,
        value: sample.value,
        rawJson: sample.rawJson as never,
      },
      create: {
        userId: input.userId,
        metricName: sample.metricName,
        date: sample.date,
        units: sample.units,
        qty: sample.qty,
        min: sample.min,
        avg: sample.avg,
        max: sample.max,
        value: sample.value,
        fingerprint: metricFingerprint(input.userId, sample.metricName, sample.rawJson),
        rawJson: sample.rawJson as never,
      },
    });
  }

  for (const day of parsed.daily) {
    await prisma.healthDaily.upsert({
      where: {
        userId_date: {
          userId: input.userId,
          date: day.date,
        },
      },
      update: {
        ...day,
        rawJson: day.rawJson as never,
      },
      create: {
        userId: input.userId,
        ...day,
        rawJson: day.rawJson as never,
      },
    });
  }

  for (const workout of parsed.workouts) {
    await prisma.healthWorkout.create({
      data: {
        userId: input.userId,
        ...workout,
        rawJson: workout.rawJson as never,
      },
    });
  }

  return parsed;
}

export async function getHealthSummary(userId: string, days: number) {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [daily, workouts] = await Promise.all([
    prisma.healthDaily.findMany({
      where: { userId, date: { gte: from } },
      orderBy: { date: "desc" },
    }),
    prisma.healthWorkout.findMany({
      where: { userId, date: { gte: from } },
      orderBy: { date: "desc" },
    }),
  ]);

  return {
    daily: daily.map((item: (typeof daily)[number]) => ({
      date: item.date.toISOString().slice(0, 10),
      sleepMinutes: item.sleepMinutes,
      restingHeartRate: item.restingHeartRate,
      hrvMs: item.hrvMs,
      vo2max: item.vo2max,
      steps: item.steps,
    })),
    workouts: workouts.map((item: (typeof workouts)[number]) => ({
      date: item.date.toISOString().slice(0, 10),
      workoutType: item.workoutType,
      durationSeconds: item.durationSeconds,
      distanceMeters: item.distanceMeters,
      averageHeartRate: item.averageHeartRate,
    })),
  };
}
