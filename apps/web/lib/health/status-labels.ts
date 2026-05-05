import type { TodayRecommendation, TrainingPlanDay } from "./types";

export function getPlanStatusLabel(status: TrainingPlanDay["status"]): string {
  const labels: Record<TrainingPlanDay["status"], string> = {
    ready: "You ready",
    adjust: "Adjust",
    skip: "Skip",
    completed: "Completed",
  };

  return labels[status];
}

export function getRecommendationStatusLabel(status: TodayRecommendation["status"]): string {
  const labels: Record<TodayRecommendation["status"], string> = {
    ready: "You ready",
    adjust: "Adjust",
    skip: "Skip",
    completed: "Completed",
  };

  return labels[status];
}
