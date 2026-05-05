import { calculateWeightTrend } from "@/lib/health/body";
import type { BodyMetric } from "@/lib/health/types";
import { formatSigned } from "@/lib/utils";
import { MetricCard, StatusBadge } from "@/components/dashboard/MetricCard";

export function WeightTrendCard({ metrics }: { metrics: BodyMetric[] }) {
  const trend = calculateWeightTrend(metrics);
  const min = Math.min(...metrics.map((metric) => metric.weightKg)) - 0.2;
  const max = Math.max(...metrics.map((metric) => metric.weightKg)) + 0.2;
  const points = metrics
    .map((metric, index) => {
      const x = (index / Math.max(metrics.length - 1, 1)) * 100;
      const y = 36 - ((metric.weightKg - min) / (max - min)) * 30;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <MetricCard title="Weight Trend" className="lg:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-5xl font-extrabold tracking-[-0.05em] text-[#090e1d]">{trend.current.toFixed(1)} kg</p>
          <p className="mt-2 text-sm font-semibold text-[#818ba0]">7-day average {trend.movingAverage7.toFixed(1)} kg</p>
        </div>
        <StatusBadge label={trend.label} tone="neutral" />
      </div>
      <svg viewBox="0 0 100 40" className="mt-5 h-24 w-full overflow-visible" aria-label="Weight trend">
        <polyline points={points} fill="none" stroke="#0f67fe" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm font-medium leading-6 text-[#3d4966]">
        4-week change {formatSigned(trend.fourWeekChange, 1)} kg. Weight trend may affect VO2 max estimates, but it is not the main training target.
      </p>
    </MetricCard>
  );
}
