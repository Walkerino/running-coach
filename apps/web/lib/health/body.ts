import type { BodyMetric } from "./types";

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function getBmiLabel(bmi: number): string {
  if (bmi < 18.5) return "Below typical range";
  if (bmi < 25) return "Typical range";
  if (bmi < 30) return "Above typical range";
  return "High range";
}

export function calculateWeightTrend(metrics: BodyMetric[]): {
  current: number;
  movingAverage7: number;
  fourWeekChange: number;
  label: "stable" | "gaining" | "losing";
} {
  const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted.at(-1)?.weightKg ?? 0;
  const last7 = sorted.slice(-7);
  const movingAverage7 = last7.reduce((sum, metric) => sum + metric.weightKg, 0) / Math.max(last7.length, 1);
  const first = sorted[0]?.weightKg ?? current;
  const fourWeekChange = Math.round((current - first) * 10) / 10;
  const label = Math.abs(fourWeekChange) < 0.4 ? "stable" : fourWeekChange > 0 ? "gaining" : "losing";

  return {
    current,
    movingAverage7: Math.round(movingAverage7 * 10) / 10,
    fourWeekChange,
    label,
  };
}
