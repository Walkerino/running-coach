import type { Vo2MaxPoint } from "@/lib/health/types";
import { formatSigned } from "@/lib/utils";
import { MetricCard } from "./MetricCard";

export function Vo2MaxCard({ points }: { points: Vo2MaxPoint[] }) {
  if (points.length === 0) {
    return (
      <MetricCard title="VO2 Max" eyebrow="Long-term trend">
        <p className="text-sm font-medium leading-6 text-[#3d4966]">No VO2 max / Cardio Fitness records are available yet.</p>
      </MetricCard>
    );
  }

  const first = points[0];
  const last = points.at(-1)!;
  const trend = last.value - first.value;
  const min = Math.min(...points.map((point) => point.value)) - 0.3;
  const max = Math.max(...points.map((point) => point.value)) + 0.3;
  const polyline = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 36 - ((point.value - min) / (max - min)) * 30;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <MetricCard title="VO2 Max" eyebrow="Long-term trend">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-5xl font-extrabold tracking-[-0.05em] text-[#090e1d]">{last.value.toFixed(1)}</p>
          <p className="mt-2 text-sm font-semibold text-[#818ba0]">Trend: {formatSigned(trend, 1)} over 6 weeks</p>
        </div>
        <p className="rounded-md bg-[#edf5ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0f67fe]">Goal 50</p>
      </div>
      <svg viewBox="0 0 100 40" className="mt-5 h-20 w-full overflow-visible" aria-label="VO2 max trend">
        <polyline points={polyline} fill="none" stroke="#0f67fe" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm font-medium leading-6 text-[#3d4966]">Cardio Fitness is treated as a slow trend, not a daily score.</p>
    </MetricCard>
  );
}
