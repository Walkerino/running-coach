import type { RecommendationType, ReadinessStatus } from "@prisma/client";

export type SuggestedSession = {
  title: string;
  durationMinutes?: number;
  distanceKm?: number;
  targetHrMin?: number;
  targetHrMax?: number;
  structure: string[];
};

export type ReadinessResult = {
  score: number;
  status: ReadinessStatus;
  recommendationType: RecommendationType;
  reasons: string[];
  warnings: string[];
  suggestedSession: SuggestedSession;
};

export type HealthSummary = {
  daily: Array<{
    date: string;
    sleepMinutes: number | null;
    restingHeartRate: number | null;
    hrvMs: number | null;
    vo2max: number | null;
    steps: number | null;
  }>;
  workouts: Array<{
    date: string;
    workoutType: string | null;
    durationSeconds: number | null;
    distanceMeters: number | null;
    averageHeartRate: number | null;
  }>;
};

export type TrainingLoadSummary = {
  weeklyDistanceKm: number;
  average4WeekDistanceKm: number;
  recentHardSessions: number;
  recentRuns: number;
};
