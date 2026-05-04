import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import { bot } from "../telegram/bot.js";
import { prisma } from "../db/prisma.js";
import { calculateReadiness } from "../training/readiness-service.js";
import { startOfToday } from "../utils/time.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const RESPIRATORY_METRIC_NAMES = [
  "respiratory_rate",
  "respiratoryRate",
  "breathing_rate",
  "breathingRate",
];

function isDueNow(input: {
  timezoneName: string;
  scheduledTime: string;
  lastSentAt: Date | null;
  now: Date;
}) {
  const localNow = dayjs(input.now).tz(input.timezoneName);
  const currentMinute = localNow.format("HH:mm");
  if (currentMinute !== input.scheduledTime) {
    return false;
  }

  if (!input.lastSentAt) {
    return true;
  }

  return dayjs(input.lastSentAt).tz(input.timezoneName).format("YYYY-MM-DD") !== localNow.format("YYYY-MM-DD");
}

function formatDuration(minutes: number | null | undefined) {
  if (minutes == null) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours <= 0) {
    return `${minutes} min`;
  }
  if (remainder === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${remainder} min`;
}

function formatBpm(value: number | null | undefined) {
  return value == null ? null : `${Math.round(value)} bpm`;
}

function formatMs(value: number | null | undefined) {
  return value == null ? null : `${Math.round(value)} ms`;
}

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value == null) {
    return null;
  }
  return value.toFixed(digits);
}

function buildMorningMessage(input: {
  readiness: Awaited<ReturnType<typeof calculateReadiness>>;
  todayDaily: {
    sleepMinutes: number | null;
    restingHeartRate: number | null;
    hrvMs: number | null;
  } | null;
  yesterdayDaily: {
    steps: number | null;
    activeEnergyKcal: number | null;
  } | null;
  yesterdayRuns: {
    distanceMeters: number | null;
    durationSeconds: number | null;
    calories: number | null;
  }[];
  respiratoryRate: number | null;
}) {
  const lines = [
    "Morning readiness",
    `- Score: ${input.readiness.score}/100 (${input.readiness.status})`,
    `- Today: ${input.readiness.suggestedSession.title}`,
  ];

  const todaySignals = [
    input.todayDaily?.sleepMinutes != null ? `sleep ${formatDuration(input.todayDaily.sleepMinutes)}` : null,
    input.todayDaily?.restingHeartRate != null ? `resting HR ${formatBpm(input.todayDaily.restingHeartRate)}` : null,
    input.todayDaily?.hrvMs != null ? `HRV ${formatMs(input.todayDaily.hrvMs)}` : null,
    input.respiratoryRate != null ? `breathing ${formatNumber(input.respiratoryRate, 1)} / min` : null,
  ].filter((item): item is string => Boolean(item));

  if (todaySignals.length > 0) {
    lines.push(`- Today signals: ${todaySignals.join(", ")}`);
  }

  const yesterdayDistanceKm = input.yesterdayRuns.reduce((sum, item) => sum + ((item.distanceMeters ?? 0) / 1000), 0);
  const yesterdayDurationMin = input.yesterdayRuns.reduce((sum, item) => sum + Math.round((item.durationSeconds ?? 0) / 60), 0);
  const yesterdayCalories = input.yesterdayDaily?.activeEnergyKcal ?? null;
  const yesterdaySummary = [
    input.yesterdayDaily?.steps != null ? `steps ${input.yesterdayDaily.steps}` : null,
    yesterdayCalories != null ? `active kcal ${Math.round(yesterdayCalories)}` : null,
    yesterdayDistanceKm > 0 ? `running ${yesterdayDistanceKm.toFixed(1)} km` : null,
    yesterdayDurationMin > 0 ? `time ${yesterdayDurationMin} min` : null,
  ].filter((item): item is string => Boolean(item));

  if (yesterdaySummary.length > 0) {
    lines.push(`- Yesterday: ${yesterdaySummary.join(", ")}`);
  }

  if (input.readiness.reasons.length > 0) {
    lines.push(`- Why: ${input.readiness.reasons[0]}`);
  }

  if (input.readiness.warnings.length > 0) {
    lines.push(`- Caution: ${input.readiness.warnings[0]}`);
  }

  const sessionBits = [
    input.readiness.suggestedSession.durationMinutes != null
      ? `duration ${input.readiness.suggestedSession.durationMinutes} min`
      : null,
    input.readiness.suggestedSession.targetHrMin != null && input.readiness.suggestedSession.targetHrMax != null
      ? `HR ${input.readiness.suggestedSession.targetHrMin}-${input.readiness.suggestedSession.targetHrMax}`
      : null,
  ].filter((item): item is string => Boolean(item));

  if (sessionBits.length > 0) {
    lines.push(`- Session: ${sessionBits.join(", ")}`);
  }

  return lines.join("\n");
}

async function getLatestRespiratoryRate(userId: string, dayStart: Date, timezoneName: string) {
  const dayEnd = dayjs(dayStart).tz(timezoneName).endOf("day").toDate();
  const sample = await prisma.healthMetricSample.findFirst({
    where: {
      userId,
      metricName: { in: RESPIRATORY_METRIC_NAMES },
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: { date: "desc" },
    select: { qty: true, avg: true },
  });

  return sample?.avg ?? sample?.qty ?? null;
}

export async function sendDueMorningReadinessNotifications(now = new Date()) {
  const users = await prisma.user.findMany({
    where: { morningReadinessEnabled: true },
    select: {
      id: true,
      telegramId: true,
      timezone: true,
      morningReadinessTime: true,
      lastMorningReadinessSentAt: true,
    },
  });

  for (const user of users) {
    const timezoneName = user.timezone || "Europe/Helsinki";
    if (
      !isDueNow({
        timezoneName,
        scheduledTime: user.morningReadinessTime,
        lastSentAt: user.lastMorningReadinessSentAt,
        now,
      })
    ) {
      continue;
    }

    const today = startOfToday(timezoneName);
    const yesterday = dayjs(today).tz(timezoneName).subtract(1, "day").startOf("day").toDate();

    const [readiness, todayDaily, yesterdayDaily, yesterdayRuns, respiratoryRate] = await Promise.all([
      calculateReadiness(user.id, today),
      prisma.healthDaily.findUnique({
        where: { userId_date: { userId: user.id, date: today } },
        select: {
          sleepMinutes: true,
          restingHeartRate: true,
          hrvMs: true,
        },
      }),
      prisma.healthDaily.findUnique({
        where: { userId_date: { userId: user.id, date: yesterday } },
        select: {
          steps: true,
          activeEnergyKcal: true,
        },
      }),
      prisma.healthWorkout.findMany({
        where: {
          userId: user.id,
          date: {
            gte: yesterday,
            lt: today,
          },
        },
        select: {
          distanceMeters: true,
          durationSeconds: true,
          calories: true,
        },
      }),
      getLatestRespiratoryRate(user.id, today, timezoneName),
    ]);

    const message = buildMorningMessage({
      readiness,
      todayDaily,
      yesterdayDaily,
      yesterdayRuns,
      respiratoryRate,
    });

    await bot.api.sendMessage(user.telegramId, message);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastMorningReadinessSentAt: now },
    });
  }
}

export const morningReadinessInternals = {
  buildMorningMessage,
  isDueNow,
};
