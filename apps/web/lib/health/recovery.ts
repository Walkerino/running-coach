import { clamp } from "@/lib/utils";
import type { RecoveryRecord, SleepRecord, UserSettings, Workout } from "./types";

type RecoveryInput = {
  sleep?: SleepRecord;
  recovery?: RecoveryRecord;
  settings: UserSettings;
  previousDayLoad: number;
  weeklyLoad: number;
  chronicLoad: number;
};

export function calculateRecoveryScore(input: RecoveryInput): {
  score: number;
  estimated: boolean;
  factors: string[];
} {
  const sleepScore = input.sleep?.score ?? input.recovery?.score ?? 65;
  const restingHr = input.recovery?.restingHeartRate;
  const hrv = input.recovery?.hrv;
  const restingHrFactor =
    restingHr === undefined || input.settings.restingHeartRateBaseline === undefined
      ? 70
      : clamp(100 - Math.max(0, restingHr - input.settings.restingHeartRateBaseline) * 7, 30, 100);
  const hrvFactor =
    hrv === undefined || input.settings.hrvBaseline === undefined
      ? 70
      : clamp(70 + ((hrv - input.settings.hrvBaseline) / input.settings.hrvBaseline) * 80, 25, 100);
  const fatigueRatio = input.chronicLoad > 0 ? input.weeklyLoad / input.chronicLoad : 1;
  const loadFactor = clamp(105 - fatigueRatio * 24 - input.previousDayLoad * 0.08, 25, 100);
  const score = Math.round(sleepScore * 0.4 + restingHrFactor * 0.2 + hrvFactor * 0.2 + loadFactor * 0.2);
  const factors = [
    `Sleep contributes ${Math.round(sleepScore)}/100.`,
    restingHr === undefined || input.settings.restingHeartRateBaseline === undefined
      ? "Resting HR baseline missing, using neutral estimate."
      : "Resting HR compared with baseline.",
    hrv === undefined ? "HRV missing, using neutral estimate." : "HRV compared with baseline.",
    "Load fatigue uses previous day and 7-day load.",
  ];

  return {
    score: clamp(score, 0, 100),
    estimated: restingHr === undefined || hrv === undefined || input.sleep === undefined,
    factors,
  };
}

export function calculatePreviousDayLoad(workouts: Workout[], today: string): number {
  const previous = new Date(`${today}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const previousDate = previous.toISOString().slice(0, 10);
  return workouts.filter((workout) => workout.date === previousDate).reduce((sum, workout) => sum + workout.load, 0);
}

export function getRecoveryLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Normal";
  if (score >= 50) return "Low";
  return "Very low";
}
