import { getLoadStatusLabel } from "./load";
import type { TrainingLoadStatus, TrainingPlanDay, UserSettings, Workout } from "./types";

type PlanInput = {
  weekStart: string;
  loadStatus: TrainingLoadStatus;
  recoveryScore: number;
  sleepScore: number;
  previousWeekDistanceKm: number;
  settings: UserSettings;
  recentWorkouts: Workout[];
};

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function makeDay(weekStart: string, index: number, partial: Omit<TrainingPlanDay, "date" | "dayName">): TrainingPlanDay {
  return {
    date: addDays(weekStart, index),
    dayName: dayNames[index],
    ...partial,
  };
}

function hrRange(input: PlanInput, zone: "z1" | "z2" | "z4") {
  const range = input.settings.hrZones[zone];
  return `${range.min}-${range.max} bpm`;
}

export function generateWeeklyPlan(input: PlanInput): TrainingPlanDay[] {
  const conservative = input.loadStatus === "above" || input.loadStatus === "well_above";
  const allowIntervals =
    input.loadStatus !== "well_above" &&
    input.loadStatus !== "well_below" &&
    input.recoveryScore >= 75 &&
    input.sleepScore >= 75;
  const longRunMinutes = conservative ? 45 : Math.min(input.settings.longRunLimitMinutes, 55);
  const easyMinutes = input.loadStatus === "well_above" ? 25 : input.loadStatus === "well_below" ? 28 : 35;

  return [
    makeDay(input.weekStart, 0, {
      workoutType: "rest",
      title: "Rest Day",
      description: "No run planned. Optional walk or light mobility.",
      coachNote: "Start the week fresh and keep recovery visible.",
      status: "ready",
    }),
    makeDay(input.weekStart, 1, {
      workoutType: "easy_run",
      title: "Easy Run",
      durationMinutes: easyMinutes,
      distanceKm: conservative ? 3.2 : 4.1,
      targetZone: "Z2",
      targetHrRange: hrRange(input, "z2"),
      description: `${easyMinutes} min relaxed aerobic run.`,
      coachNote: "Keep it conversational; no pace target.",
      status: input.loadStatus === "well_above" ? "adjust" : "ready",
    }),
    makeDay(input.weekStart, 2, {
      workoutType: "mobility_strength",
      title: "Mobility / Strength",
      durationMinutes: 20,
      targetZone: "Z1",
      description: "Light hips, calves, core, and easy range of motion.",
      coachNote: "Support running economy without adding meaningful fatigue.",
      status: "ready",
    }),
    makeDay(input.weekStart, 3, {
      workoutType: "easy_run",
      title: conservative ? "Recovery Run" : "Easy Run",
      durationMinutes: conservative ? 25 : 35,
      distanceKm: conservative ? 2.8 : 4.2,
      targetZone: conservative ? "Z1" : "Z2",
      targetHrRange: conservative ? hrRange(input, "z1") : hrRange(input, "z2"),
      description: conservative ? "Short, very easy run only if legs feel normal." : "Steady Zone 2 base run.",
      coachNote: conservative ? "Stop early if effort drifts up." : "Build consistency before intensity.",
      status: conservative ? "adjust" : "ready",
    }),
    makeDay(input.weekStart, 4, {
      workoutType: allowIntervals ? "intervals" : "easy_run",
      title: allowIntervals ? "Intervals" : "Easy Run",
      durationMinutes: allowIntervals ? 42 : 30,
      distanceKm: allowIntervals ? 4.8 : 3.5,
      targetZone: allowIntervals ? "Z4" : "Z2",
      targetHrRange: allowIntervals ? `${hrRange(input, "z4")} on hard reps` : hrRange(input, "z2"),
      description: allowIntervals ? "10 min warm-up, 5 x 2 min hard / 2 min easy, 10 min cool-down." : "Replace intensity with easy aerobic work.",
      coachNote: allowIntervals ? "Hard means controlled, not all-out." : "Intervals skipped because recovery/load does not justify intensity.",
      status: allowIntervals ? "ready" : "adjust",
    }),
    makeDay(input.weekStart, 5, {
      workoutType: "rest",
      title: "Rest Day",
      description: "Full rest or an easy walk.",
      coachNote: "Place rest after the quality day or adjusted aerobic day.",
      status: "ready",
    }),
    makeDay(input.weekStart, 6, {
      workoutType: "long_easy_run",
      title: "Long Easy Run",
      durationMinutes: longRunMinutes,
      distanceKm: conservative ? 5.2 : 6.3,
      targetZone: "Z2",
      targetHrRange: hrRange(input, "z2"),
      description: `${longRunMinutes} min easy, steady breathing.`,
      coachNote: conservative ? "Do not extend the long run this week." : "Small long-run exposure for aerobic base.",
      status: input.loadStatus === "well_above" ? "skip" : "ready",
    }),
  ];
}

export function generatePlanRationale(input: PlanInput): string[] {
  return [
    `Last week: ${input.previousWeekDistanceKm.toFixed(1)} km, kept within a conservative progression range.`,
    `Load status: ${getLoadStatusLabel(input.loadStatus).toLowerCase()}, so intensity is adjusted before volume.`,
    `Recovery: ${input.recoveryScore}/100 and sleep: ${input.sleepScore}/100.`,
    input.loadStatus === "steady" ? "VO2 max goal supports one controlled interval session." : "VO2 max work waits until recovery and load are stable.",
    "At least one full rest day is kept after intensity.",
  ];
}
