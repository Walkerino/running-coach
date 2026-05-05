import { calculateBmi, getBmiLabel } from "@/lib/health/body";
import type { BodyMetric } from "@/lib/health/types";
import { MetricCard } from "@/components/dashboard/MetricCard";

export function BmiCard({ metric }: { metric: BodyMetric }) {
  const bmi = calculateBmi(metric.weightKg, metric.heightCm);

  return (
    <MetricCard title="BMI">
      <p className="text-5xl font-extrabold tracking-[-0.05em] text-[#090e1d]">{bmi.toFixed(1)}</p>
      <p className="mt-2 text-sm font-semibold text-[#818ba0]">
        {metric.heightCm} cm · {metric.weightKg.toFixed(1)} kg
      </p>
      <p className="mt-5 text-sm font-medium leading-6 text-[#3d4966]">
        {getBmiLabel(bmi)}. BMI is approximate and does not reflect body composition or running fitness.
      </p>
    </MetricCard>
  );
}
