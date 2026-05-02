import { prisma } from "../db/prisma.js";
import { getHealthSummary } from "../health/health-service.js";
import { getTrainingLoad } from "../training/readiness-service.js";

export async function buildUserSummary(userId: string) {
  const [user, runs, health, healthMetricNames, latestHealthImport, readiness, trainingLoad] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.healthWorkout.findMany({
      where: {
        userId,
        OR: [
          { workoutType: { contains: "run", mode: "insensitive" } },
          { workoutType: { contains: "running", mode: "insensitive" } },
          { workoutType: { contains: "jog", mode: "insensitive" } },
          { workoutType: { contains: "treadmill", mode: "insensitive" } },
        ],
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
    getHealthSummary(userId, 14),
    prisma.healthMetricSample.findMany({
      where: { userId, date: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      distinct: ["metricName"],
      select: { metricName: true },
      orderBy: { metricName: "asc" },
    }),
    prisma.healthPayloadImport.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        dailyCount: true,
        workoutCount: true,
        metricSampleCount: true,
        topLevelKeys: true,
      },
    }),
    prisma.readinessScore.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
    }),
    getTrainingLoad(userId, 28),
  ]);

  return {
    user,
    readiness,
    trainingLoad,
    recentRuns: runs.map((run: (typeof runs)[number]) => ({
      date: run.date.toISOString(),
      workoutType: run.workoutType,
      distanceMeters: run.distanceMeters,
      durationSeconds: run.durationSeconds,
      averageHeartRate: run.averageHeartRate,
    })),
    health,
    latestHealthImport,
    healthMetricNames: healthMetricNames.map((item) => item.metricName),
  };
}
