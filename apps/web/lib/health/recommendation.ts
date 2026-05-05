import type { TodayRecommendation, TrainingLoadStatus, TrainingPlanDay } from "./types";

type RecommendationInput = {
  plannedWorkout?: TrainingPlanDay;
  recoveryScore: number;
  sleepScore: number;
  loadStatus: TrainingLoadStatus;
  recentHardWorkoutDaysAgo?: number;
  injuryNotes?: string;
};

export function generateTodayRecommendation(input: RecommendationInput): TodayRecommendation {
  const planned = input.plannedWorkout;

  if (input.injuryNotes?.trim()) {
    return {
      title: "Today: Adjust first",
      workoutType: "Check symptoms first",
      status: "adjust",
      reason: "Injury or pain notes are present. Do not train through sharp, persistent, or unusual pain.",
    };
  }

  if (input.recoveryScore < 50 || input.sleepScore < 55) {
    return {
      title: "Today: Rest / walk",
      workoutType: "Rest or easy walk",
      durationMinutes: 20,
      targetZone: "Z1",
      targetHrRange: "Easy breathing",
      status: "skip",
      reason: "Low recovery or sleep makes training adaptation less likely today.",
    };
  }

  if (input.loadStatus === "well_above") {
    return {
      title: "Today: Recovery only",
      workoutType: "Recovery run or walk",
      durationMinutes: 20,
      targetZone: "Z1",
      targetHrRange: "100-130 bpm",
      status: "skip",
      reason: "7-day load is well above baseline, so fatigue risk is elevated.",
    };
  }

  if (!planned || planned.workoutType === "rest") {
    return {
      title: "Today: Rest / mobility",
      workoutType: "Rest day",
      durationMinutes: 15,
      targetZone: "Z1",
      status: "ready",
      reason: "No run is planned. Optional light mobility is enough.",
    };
  }

  if (planned.workoutType === "intervals" && (input.recoveryScore < 75 || input.loadStatus === "above")) {
    return {
      title: "Today: Easy run 30 min, Zone 2",
      workoutType: "Easy Run",
      durationMinutes: 30,
      targetZone: "Z2",
      targetHrRange: "130-140 bpm",
      status: "adjust",
      reason: "Intervals are reduced because recovery or load is not ideal for intensity.",
    };
  }

  return {
    title: `Today: ${planned.title}${planned.durationMinutes ? ` ${planned.durationMinutes} min` : ""}`,
    workoutType: planned.title,
    durationMinutes: planned.durationMinutes,
    targetZone: planned.targetZone,
    targetHrRange: planned.targetHrRange,
    status: "ready",
    reason:
      input.recentHardWorkoutDaysAgo !== undefined && input.recentHardWorkoutDaysAgo < 2
        ? "Plan is kept easy because the last hard session was recent."
        : "Sleep, recovery, and load are stable enough for the planned session.",
  };
}
