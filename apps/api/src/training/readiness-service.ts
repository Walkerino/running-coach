import { RecommendationType, ReadinessStatus } from "@prisma/client";
import type { StravaActivity } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import type { ReadinessResult, TrainingLoadSummary } from "../types.js";
import { startOfToday } from "../utils/time.js";

function average(values: Array<number | null | undefined>): number | null {
  const normalized = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (normalized.length === 0) {
    return null;
  }
  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
}

function classifyRun(
  activity: Pick<StravaActivity, "averageHeartrate" | "sufferScore" | "movingTimeSeconds" | "type" | "sportType">,
  easyHrMin = 130,
  easyHrMax = 140,
): "easy" | "hard" | "unknown" {
  const label = `${activity.sportType ?? ""} ${activity.type ?? ""}`.toLowerCase();
  if (label.includes("interval") || label.includes("workout") || label.includes("race")) {
    return "hard";
  }

  if (activity.sufferScore && activity.sufferScore >= 50) {
    return "hard";
  }

  if (activity.averageHeartrate == null || activity.movingTimeSeconds == null) {
    return "unknown";
  }

  if (activity.averageHeartrate > easyHrMax + 10 || activity.movingTimeSeconds > 70 * 60) {
    return "hard";
  }

  if (
    activity.averageHeartrate >= easyHrMin &&
    activity.averageHeartrate <= easyHrMax &&
    activity.movingTimeSeconds <= 60 * 60
  ) {
    return "easy";
  }

  return "unknown";
}

export async function getTrainingLoad(userId: string, days: number): Promise<TrainingLoadSummary> {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const activities = await prisma.stravaActivity.findMany({
    where: {
      userId,
      startDate: { gte: from },
      isDeleted: false,
    },
    orderBy: { startDate: "desc" },
  });

  const lastWeekDistance = activities
    .filter((item: StravaActivity) => item.startDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .reduce((sum: number, item: StravaActivity) => sum + (item.distanceMeters ?? 0), 0);

  const distanceByWeek = [0, 1, 2, 3].map((weekIndex) => {
    const end = new Date(Date.now() - weekIndex * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    return (
      activities
        .filter((item: StravaActivity) => item.startDate >= start && item.startDate < end)
        .reduce((sum: number, item: StravaActivity) => sum + (item.distanceMeters ?? 0), 0) / 1000
    );
  });

  const recentHardSessions = activities.filter((item: StravaActivity) =>
    classifyRun(item, 130, 140) === "hard" &&
    item.startDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  ).length;

  return {
    weeklyDistanceKm: Number((lastWeekDistance / 1000).toFixed(1)),
    average4WeekDistanceKm: Number(
      (distanceByWeek.reduce((sum, value) => sum + value, 0) / distanceByWeek.length).toFixed(1),
    ),
    recentHardSessions,
    recentRuns: activities.length,
  };
}

export async function calculateReadiness(userId: string, date = startOfToday()): Promise<ReadinessResult> {
  const [user, health7, health28, activities28, feedback] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.healthDaily.findMany({
      where: { userId, date: { gte: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: "desc" },
    }),
    prisma.healthDaily.findMany({
      where: { userId, date: { gte: new Date(date.getTime() - 28 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: "desc" },
    }),
    prisma.stravaActivity.findMany({
      where: { userId, startDate: { gte: new Date(date.getTime() - 28 * 24 * 60 * 60 * 1000) }, isDeleted: false },
      orderBy: { startDate: "desc" },
    }),
    prisma.subjectiveFeedback.findFirst({
      where: { userId, date: { lte: date } },
      orderBy: { date: "desc" },
    }),
  ]);

  const easyHrMin = user?.usualEasyHrMin ?? 130;
  const easyHrMax = user?.usualEasyHrMax ?? 140;
  const latestHealth = health7[0];
  const baselineSleep = average(health28.map((item) => item.sleepMinutes));
  const baselineRhr = average(health28.map((item) => item.restingHeartRate));
  const baselineHrv = average(health28.map((item) => item.hrvMs));
  const recentHard = activities28.filter(
    (item: StravaActivity) =>
      classifyRun(item, easyHrMin, easyHrMax) === "hard" &&
      item.startDate >= new Date(date.getTime() - 72 * 60 * 60 * 1000),
  );
  const hardIn48h = recentHard.some(
    (item: StravaActivity) => item.startDate >= new Date(date.getTime() - 48 * 60 * 60 * 1000),
  );
  const weeklyDistanceMeters = activities28
    .filter((item: StravaActivity) => item.startDate >= new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000))
    .reduce((sum: number, item: StravaActivity) => sum + (item.distanceMeters ?? 0), 0);
  const fourWeekAvgMeters = activities28.reduce(
    (sum: number, item: StravaActivity) => sum + (item.distanceMeters ?? 0),
    0,
  ) / 4;

  let score = 70;
  const reasons: string[] = [];
  const warnings: string[] = [];
  let recommendationType: RecommendationType = RecommendationType.easy_run;
  let status: ReadinessStatus = ReadinessStatus.medium;

  const symptoms = feedback?.symptoms?.toLowerCase() ?? "";
  const seriousSymptoms = ["chest pain", "dizziness", "shortness of breath", "fainting", "sharp pain"];
  if (seriousSymptoms.some((item: string) => symptoms.includes(item))) {
    score = 0;
    status = ReadinessStatus.low;
    recommendationType = RecommendationType.rest;
    warnings.push("Reported symptoms may require medical attention.");
    reasons.push("Concerning symptoms were reported recently.");
  }

  if (latestHealth) {
    if (baselineSleep && latestHealth.sleepMinutes != null && latestHealth.sleepMinutes < baselineSleep * 0.75) {
      score -= 15;
      reasons.push("Sleep is meaningfully below your recent baseline.");
    }
    if (baselineRhr && latestHealth.restingHeartRate != null && latestHealth.restingHeartRate > baselineRhr + 5) {
      score -= 15;
      reasons.push("Resting heart rate is elevated versus baseline.");
    }
    if (baselineHrv && latestHealth.hrvMs != null && latestHealth.hrvMs < baselineHrv * 0.85) {
      score -= 15;
      reasons.push("HRV is below your recent baseline.");
    }
  } else {
    score -= 10;
    warnings.push("Recent health recovery data is missing, so advice is conservative.");
  }

  if (hardIn48h && score < 85) {
    score -= 10;
    reasons.push("A hard session was completed within the last 48 hours.");
  }

  if (fourWeekAvgMeters > 0 && weeklyDistanceMeters > fourWeekAvgMeters * 1.25) {
    score -= 10;
    reasons.push("Weekly volume is over 25% above your recent average.");
  }

  if (feedback?.energy != null && feedback.energy <= 2) {
    score -= 10;
    reasons.push("You reported low energy.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score < 45) {
    status = ReadinessStatus.low;
    recommendationType = latestHealth ? RecommendationType.recovery : RecommendationType.rest;
  } else if (score < 75) {
    status = ReadinessStatus.medium;
    recommendationType = RecommendationType.easy_run;
  } else if (!hardIn48h && recentHard.length === 0) {
    status = ReadinessStatus.high;
    recommendationType = RecommendationType.quality_session;
  } else {
    status = ReadinessStatus.high;
    recommendationType = RecommendationType.long_easy;
  }

  const qualitySessionsThisWeek = activities28.filter(
    (item: StravaActivity) =>
      classifyRun(item, easyHrMin, easyHrMax) === "hard" &&
      item.startDate >= new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000),
  ).length;

  if (recommendationType === RecommendationType.quality_session && qualitySessionsThisWeek >= 1) {
    recommendationType = RecommendationType.easy_run;
    warnings.push("Interval work is capped at one session per week in this MVP.");
  }

  if (reasons.length === 0) {
    reasons.push("No strong fatigue signals were detected in recent data.");
  }

  const suggestedSession =
    recommendationType === RecommendationType.rest
      ? {
          title: "Rest day",
          structure: ["Skip running today.", "Short walk and mobility are optional if you feel normal."],
        }
      : recommendationType === RecommendationType.recovery
        ? {
            title: "Recovery day",
            durationMinutes: 20,
            targetHrMin: easyHrMin,
            targetHrMax: easyHrMin + 5,
            structure: ["10-20 min easy walk or jog", "Keep effort conversational", "Stop if symptoms worsen"],
          }
        : recommendationType === RecommendationType.quality_session
          ? {
              title: "VO2max interval session",
              durationMinutes: 40,
              targetHrMin: easyHrMin,
              targetHrMax: easyHrMax + 20,
              structure: [
                "10 min warm-up",
                "4 x 2 min controlled hard reps with 2 min easy jog recovery",
                "10 min cooldown",
              ],
            }
          : recommendationType === RecommendationType.long_easy
            ? {
                title: "Long easy run",
                durationMinutes: 45,
                targetHrMin: easyHrMin,
                targetHrMax: easyHrMax,
                structure: ["10 min warm-up", "30 min easy running", "5 min walk cooldown"],
              }
            : {
                title: "Easy aerobic run",
                durationMinutes: 30,
                targetHrMin: easyHrMin,
                targetHrMax: easyHrMax,
                structure: ["7 min warm-up walk/jog", "20-30 min easy run", "5 min cooldown walk"],
              };

  const result = {
    score,
    status,
    recommendationType,
    reasons,
    warnings,
    suggestedSession,
  } satisfies ReadinessResult;

  await prisma.readinessScore.upsert({
    where: { userId_date: { userId, date } },
    update: {
      score: result.score,
      status: result.status,
      recommendationType: result.recommendationType,
      reasonsJson: result.reasons as never,
      warningsJson: result.warnings as never,
      suggestedSessionJson: result.suggestedSession as never,
    },
    create: {
      userId,
      date,
      score: result.score,
      status: result.status,
      recommendationType: result.recommendationType,
      reasonsJson: result.reasons as never,
      warningsJson: result.warnings as never,
      suggestedSessionJson: result.suggestedSession as never,
    },
  });

  return result;
}
