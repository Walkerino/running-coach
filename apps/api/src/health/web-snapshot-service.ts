import type { HealthDaily, HealthWorkout, User } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { calculateReadiness } from "../training/readiness-service.js";
import { formatAppDate, startOfToday, toAppDate } from "../utils/time.js";

type ZoneKey = "z1" | "z2" | "z3" | "z4" | "z5";
type ZoneMinutes = Record<ZoneKey, number>;
type HrZones = Record<ZoneKey, { min: number; max: number }>;

const zoneKeys: ZoneKey[] = ["z1", "z2", "z3", "z4", "z5"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDefaultHrZones(age: number): HrZones {
  const hrMax = 220 - age;
  return {
    z1: { min: Math.round(hrMax * 0.5), max: Math.round(hrMax * 0.6) },
    z2: { min: Math.round(hrMax * 0.6), max: Math.round(hrMax * 0.7) },
    z3: { min: Math.round(hrMax * 0.7), max: Math.round(hrMax * 0.8) },
    z4: { min: Math.round(hrMax * 0.8), max: Math.round(hrMax * 0.9) },
    z5: { min: Math.round(hrMax * 0.9), max: hrMax },
  };
}

function getUserHrZones(user: User): HrZones {
  const defaults = getDefaultHrZones(user.age ?? 20);
  return {
    z1: { min: user.hrZone1Min ?? defaults.z1.min, max: user.hrZone1Max ?? defaults.z1.max },
    z2: { min: user.hrZone2Min ?? defaults.z2.min, max: user.hrZone2Max ?? defaults.z2.max },
    z3: { min: user.hrZone3Min ?? defaults.z3.min, max: user.hrZone3Max ?? defaults.z3.max },
    z4: { min: user.hrZone4Min ?? defaults.z4.min, max: user.hrZone4Max ?? defaults.z4.max },
    z5: { min: user.hrZone5Min ?? defaults.z5.min, max: user.hrZone5Max ?? defaults.z5.max },
  };
}

function zoneForBpm(bpm: number | null | undefined, zones: HrZones): ZoneKey | null {
  if (bpm == null || !Number.isFinite(bpm)) return null;
  for (const zone of zoneKeys) {
    if (bpm >= zones[zone].min && bpm <= zones[zone].max) return zone;
  }
  if (bpm > zones.z5.max) return "z5";
  return null;
}

function calculateWorkoutLoad(zones: ZoneMinutes) {
  return Math.round(zones.z1 * 1 + zones.z2 * 2 + zones.z3 * 3 + zones.z4 * 5 + zones.z5 * 7);
}

function formatHrRange(range: { min: number; max: number }) {
  return `${range.min}-${range.max} bpm`;
}

function emptyZones(): ZoneMinutes {
  return { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractZoneMinutes(rawJson: unknown): ZoneMinutes | null {
  const raw = readObject(rawJson);
  if (!raw) return null;

  const candidates = [raw.zones, raw.zoneMinutes, raw.hrZones, raw.heartRateZones, raw.heart_rate_zones]
    .map(readObject)
    .filter((value): value is Record<string, unknown> => Boolean(value));

  for (const candidate of candidates) {
    const zones = emptyZones();
    let found = false;

    zoneKeys.forEach((zone, index) => {
      const value =
        readNumber(candidate[zone]) ??
        readNumber(candidate[zone.toUpperCase()]) ??
        readNumber(candidate[`zone${index + 1}`]) ??
        readNumber(candidate[`Zone ${index + 1}`]);
      if (value != null) {
        zones[zone] = value;
        found = true;
      }
    });

    if (found) return zones;
  }

  return null;
}

function estimateZoneMinutes(workout: HealthWorkout, hrZones: HrZones): ZoneMinutes {
  const direct = extractZoneMinutes(workout.rawJson);
  if (direct) return direct;

  const durationMinutes = Math.round((workout.durationSeconds ?? 0) / 60);
  const zone = zoneForBpm(workout.averageHeartRate, hrZones);
  const zones = emptyZones();
  if (zone && durationMinutes > 0) zones[zone] = durationMinutes;
  return zones;
}

function workoutType(type: string | null): "run" | "walk" | "strength" | "cycling" | "mobility" | "other" {
  const normalized = (type ?? "").toLowerCase();
  if (normalized.includes("run") || normalized.includes("jog")) return "run";
  if (normalized.includes("walk")) return "walk";
  if (normalized.includes("cycle") || normalized.includes("bike")) return "cycling";
  if (normalized.includes("strength")) return "strength";
  if (normalized.includes("mobility") || normalized.includes("yoga")) return "mobility";
  return "other";
}

function formatPace(durationSeconds: number | null, distanceMeters: number | null) {
  if (!durationSeconds || !distanceMeters || distanceMeters <= 0) return undefined;
  const minutesPerKm = durationSeconds / 60 / (distanceMeters / 1000);
  const minutes = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

function sleepScore(minutes: number | null | undefined) {
  if (minutes == null) return 65;
  const target = 8 * 60;
  const score = minutes <= target ? (minutes / target) * 100 : 100 - ((minutes - target) / 120) * 10;
  return Math.round(clamp(score, 35, 100));
}

function normalizeSleepScore(value: number | null) {
  if (value == null) return null;
  const normalized = value > 0 && value <= 1 ? value * 100 : value;
  if (normalized < 0 || normalized > 100) return null;
  return Math.round(normalized);
}

function readScoreCandidate(raw: Record<string, unknown> | null) {
  if (!raw) return null;
  return normalizeSleepScore(
    readNumber(raw.sleepScore) ??
      readNumber(raw.sleep_score) ??
      readNumber(raw.sleepQualityScore) ??
      readNumber(raw.sleep_quality_score) ??
      readNumber(raw.score),
  );
}

function getImportedSleepScore(daily: HealthDaily) {
  const raw = readObject(daily.rawJson);
  const direct = readScoreCandidate(raw);
  if (direct != null) return direct;

  for (const key of ["sleep_analysis", "sleepAnalysis", "sleep"]) {
    const nested = readScoreCandidate(readObject(raw?.[key]));
    if (nested != null) return nested;
  }

  return null;
}

function getRespiratoryRate(daily: HealthDaily) {
  const raw = readObject(daily.rawJson);
  const respiratory = raw?.respiratory_rate ?? raw?.respiratoryRate ?? raw?.breathing_rate ?? raw?.breathingRate;
  return readNumber(respiratory);
}

function roundedAverage(values: Array<number | null | undefined>) {
  const present = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (present.length === 0) return undefined;
  return Math.round(present.reduce((sum, value) => sum + value, 0) / present.length);
}

export async function resolveUser(input: { userId?: string; telegramId?: string }) {
  if (input.userId) return prisma.user.findUnique({ where: { id: input.userId } });
  if (input.telegramId) return prisma.user.findUnique({ where: { telegramId: input.telegramId } });

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2 });
  if (users.length === 1) return users[0];
  return null;
}

function workoutDedupeKey(workout: HealthWorkout, timezone: string) {
  const localDate = formatAppDate(workout.date, timezone);
  const startMinute = Math.round(workout.date.getTime() / 60000);
  const duration = workout.durationSeconds ?? 0;
  const distance = workout.distanceMeters != null ? Math.round(workout.distanceMeters / 10) * 10 : 0;
  return [
    localDate,
    startMinute,
    workoutType(workout.workoutType),
    Math.round(duration / 5) * 5,
    distance,
  ].join(":");
}

function workoutCompleteness(workout: HealthWorkout) {
  return [
    extractZoneMinutes(workout.rawJson) ? 4 : 0,
    workout.averageHeartRate != null ? 2 : 0,
    workout.maxHeartRate != null ? 1 : 0,
    workout.distanceMeters != null ? 1 : 0,
    workout.durationSeconds != null ? 1 : 0,
    workout.calories != null ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function dedupeWorkouts(workouts: HealthWorkout[], timezone: string) {
  const byKey = new Map<string, HealthWorkout>();

  for (const workout of workouts) {
    const key = workoutDedupeKey(workout, timezone);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, workout);
      continue;
    }

    const currentScore = workoutCompleteness(current);
    const nextScore = workoutCompleteness(workout);
    if (nextScore > currentScore || (nextScore === currentScore && workout.updatedAt > current.updatedAt)) {
      byKey.set(key, workout);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function getWebHealthSnapshot(input: { userId?: string; telegramId?: string }) {
  const user = await resolveUser(input);
  if (!user) return null;

  const timezone = user.timezone || "Europe/Helsinki";
  const today = startOfToday(timezone);
  const from = new Date(today.getTime() - 42 * 24 * 60 * 60 * 1000);
  const [daily, workouts, readinessScores, completions] = await Promise.all([
    prisma.healthDaily.findMany({
      where: { userId: user.id, date: { gte: from } },
      orderBy: { date: "asc" },
    }),
    prisma.healthWorkout.findMany({
      where: { userId: user.id, date: { gte: from } },
      orderBy: { date: "asc" },
    }),
    prisma.readinessScore.findMany({
      where: { userId: user.id, date: { gte: from } },
      orderBy: { date: "asc" },
    }),
    prisma.trainingPlanCompletion.findMany({
      where: { userId: user.id, date: { gte: from } },
      orderBy: { date: "asc" },
    }),
  ]);

  const todayReadiness = await calculateReadiness(user.id, today);
  const readinessByDate = new Map(readinessScores.map((item) => [formatAppDate(item.date, timezone), { score: item.score }]));
  readinessByDate.set(formatAppDate(today, timezone), {
    score: todayReadiness.score,
  });

  const hrZones = getUserHrZones(user);
  const dedupedWorkouts = dedupeWorkouts(workouts, timezone);
  const webWorkouts = dedupedWorkouts.map((workout) => {
    const zones = estimateZoneMinutes(workout, hrZones);
    const durationMinutes = Math.round((workout.durationSeconds ?? 0) / 60);
    const distanceKm = workout.distanceMeters != null ? Number((workout.distanceMeters / 1000).toFixed(2)) : undefined;

    return {
      id: workout.id,
      userId: user.id,
      date: formatAppDate(workout.date, timezone),
      type: workoutType(workout.workoutType),
      title: workout.workoutType ?? "Workout",
      durationMinutes,
      distanceKm,
      avgPace: formatPace(workout.durationSeconds, workout.distanceMeters),
      avgHeartRate: workout.averageHeartRate != null ? Math.round(workout.averageHeartRate) : undefined,
      maxHeartRate: workout.maxHeartRate != null ? Math.round(workout.maxHeartRate) : undefined,
      zones,
      load: calculateWorkoutLoad(zones),
      source: "apple_health" as const,
      notes: extractZoneMinutes(workout.rawJson)
        ? "Load calculated from imported heart-rate zones."
        : "Load estimated from average heart rate.",
    };
  });

  const sleep = daily
    .filter((item) => item.sleepMinutes != null)
    .map((item) => {
      const importedScore = getImportedSleepScore(item);
      return {
        date: formatAppDate(item.date, timezone),
        score: importedScore ?? sleepScore(item.sleepMinutes),
        scoreEstimated: importedScore == null,
        durationMinutes: item.sleepMinutes!,
        respiratoryRate: getRespiratoryRate(item) ?? undefined,
      };
    });

  const dailyByDate = new Map(daily.map((item) => [formatAppDate(item.date, timezone), item]));
  const recovery = Array.from(readinessByDate.entries()).map(([date, readiness]) => {
    const item = dailyByDate.get(date);
    return {
      date,
      score: readiness.score,
      restingHeartRate: item?.restingHeartRate != null ? Math.round(item.restingHeartRate) : undefined,
      hrv: item?.hrvMs != null ? Math.round(item.hrvMs) : undefined,
      respiratoryRate: item ? getRespiratoryRate(item) ?? undefined : undefined,
      note: "Calculated by training engine.",
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  const vo2Max = daily
    .filter((item) => item.vo2max != null)
    .map((item) => ({
      date: formatAppDate(item.date, timezone),
      value: Number(item.vo2max!.toFixed(1)),
    }));

  const body = user.weightKg != null && user.heightCm != null
    ? [{
        date: formatAppDate(today, timezone),
        weightKg: user.weightKg,
        heightCm: user.heightCm,
      }]
    : [];

  return {
    source: "backend_api",
    timezone,
    user: {
      id: user.id,
      telegramId: user.telegramId,
    },
    settings: {
      goal: user.goal ?? "Improve VO2 max toward 50 while keeping easy running consistent.",
      age: user.age ?? 20,
      heightCm: user.heightCm ?? undefined,
      weightKg: user.weightKg ?? undefined,
      hrMax: 220 - (user.age ?? 20),
      preferredEasyHrRange: formatHrRange(hrZones.z2),
      weeklyRunFrequency: user.runningFrequencyPerWeek ?? 5,
      longRunLimitMinutes: 60,
      preferredWorkoutDays: ["Tuesday", "Thursday", "Friday", "Sunday"],
      unavailableDays: [],
      restingHeartRateBaseline: roundedAverage(daily.map((item) => item.restingHeartRate)),
      hrvBaseline: roundedAverage(daily.map((item) => item.hrvMs)),
      respiratoryRateBaseline: undefined,
      hrZones,
    },
    workouts: webWorkouts,
    sleep,
    recovery,
    body,
    vo2Max,
    completions: completions.map((item) => ({
      date: formatAppDate(item.date, timezone),
      workoutType: item.workoutType,
      title: item.title,
      completedAt: item.completedAt.toISOString(),
    })),
    meta: {
      hasRealData: daily.length > 0 || dedupedWorkouts.length > 0,
      workoutCount: dedupedWorkouts.length,
      dailyCount: daily.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function updateWebHrZones(input: {
  userId?: string;
  telegramId?: string;
  hrZones: HrZones;
}) {
  const user = await resolveUser(input);
  if (!user) return null;

  return prisma.user.update({
    where: { id: user.id },
    data: {
      hrZone1Min: input.hrZones.z1.min,
      hrZone1Max: input.hrZones.z1.max,
      hrZone2Min: input.hrZones.z2.min,
      hrZone2Max: input.hrZones.z2.max,
      hrZone3Min: input.hrZones.z3.min,
      hrZone3Max: input.hrZones.z3.max,
      hrZone4Min: input.hrZones.z4.min,
      hrZone4Max: input.hrZones.z4.max,
      hrZone5Min: input.hrZones.z5.min,
      hrZone5Max: input.hrZones.z5.max,
    },
  });
}

export async function setTrainingPlanCompletion(input: {
  userId?: string;
  telegramId?: string;
  date: string;
  workoutType: string;
  title?: string;
}) {
  const user = await resolveUser(input);
  if (!user) return null;

  return prisma.trainingPlanCompletion.upsert({
    where: {
      userId_date_workoutType: {
        userId: user.id,
        date: toAppDate(input.date, user.timezone),
        workoutType: input.workoutType,
      },
    },
    update: {
      title: input.title,
      completedAt: new Date(),
      source: "web",
    },
    create: {
      userId: user.id,
      date: toAppDate(input.date, user.timezone),
      workoutType: input.workoutType,
      title: input.title,
      source: "web",
    },
  });
}

export async function deleteTrainingPlanCompletion(input: {
  userId?: string;
  telegramId?: string;
  date: string;
  workoutType: string;
}) {
  const user = await resolveUser(input);
  if (!user) return null;

  await prisma.trainingPlanCompletion.deleteMany({
    where: {
      userId: user.id,
      date: toAppDate(input.date, user.timezone),
      workoutType: input.workoutType,
    },
  });

  return { ok: true };
}
