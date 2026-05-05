import type { TrainingLoadStatus, Workout, ZoneMinutes } from "./types";

const dayMs = 24 * 60 * 60 * 1000;

export function calculateWorkoutLoad(zones: ZoneMinutes): number {
  return Math.round(zones.z1 * 1 + zones.z2 * 2 + zones.z3 * 3 + zones.z4 * 5 + zones.z5 * 7);
}

function daysBetween(date: string, today: string): number {
  return Math.floor((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${date}T12:00:00Z`).getTime()) / dayMs);
}

export function calculateAcuteLoad(workouts: Workout[], today: string): number {
  return workouts
    .filter((workout) => {
      const age = daysBetween(workout.date, today);
      return age >= 0 && age < 7;
    })
    .reduce((sum, workout) => sum + workout.load, 0);
}

export function calculateChronicLoad(workouts: Workout[], today: string): {
  chronicLoad: number;
  hasEnoughBaseline: boolean;
  isApproximate: boolean;
} {
  const recent = workouts.filter((workout) => {
    const age = daysBetween(workout.date, today);
    return age >= 0 && age < 28;
  });
  const oldestAge = recent.reduce((max, workout) => Math.max(max, daysBetween(workout.date, today)), 0);
  const hasEnoughBaseline = oldestAge >= 27;
  const total = recent.reduce((sum, workout) => sum + workout.load, 0);

  return {
    chronicLoad: Math.round(total / 4),
    hasEnoughBaseline,
    isApproximate: !hasEnoughBaseline && recent.length > 0,
  };
}

export function calculateLoadRatio(acuteLoad: number, chronicLoad: number): number | null {
  if (chronicLoad <= 0) return null;
  return acuteLoad / chronicLoad;
}

export function calculateTrainingLoadStatus(
  acuteLoad: number,
  chronicLoad: number,
  hasEnoughBaseline: boolean,
): {
  ratio: number | null;
  status: TrainingLoadStatus;
} {
  if (!hasEnoughBaseline || chronicLoad <= 0) {
    return {
      ratio: null,
      status: "building_baseline",
    };
  }

  const ratio = acuteLoad / chronicLoad;

  if (ratio < 0.75) return { ratio, status: "well_below" };
  if (ratio < 0.9) return { ratio, status: "below" };
  if (ratio <= 1.1) return { ratio, status: "steady" };
  if (ratio <= 1.3) return { ratio, status: "above" };

  return { ratio, status: "well_above" };
}

export function getLoadStatusLabel(status: TrainingLoadStatus): string {
  const labels: Record<TrainingLoadStatus, string> = {
    well_below: "Well Below",
    below: "Below",
    steady: "Steady",
    above: "Above",
    well_above: "Well Above",
    building_baseline: "Building baseline",
  };

  return labels[status];
}

export function getLoadStatusRecommendation(status: TrainingLoadStatus): string {
  const recommendations: Record<TrainingLoadStatus, string> = {
    well_below: "Return gradually with easy Zone 2 volume.",
    below: "Add easy volume carefully; avoid chasing intensity.",
    steady: "Normal training is appropriate if recovery stays stable.",
    above: "Keep today easy and avoid adding intervals.",
    well_above: "Prefer rest or recovery work until load normalizes.",
    building_baseline: "Collect more data before trusting load trends.",
  };

  return recommendations[status];
}
