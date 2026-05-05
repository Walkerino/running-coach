import { formatMinutes } from "@/lib/utils";
import type { SleepRecord } from "@/lib/health/types";
import { MetricCard, StatusBadge } from "./MetricCard";

function quality(score: number): string {
  if (score >= 82) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 58) return "Light";
  return "Low";
}

export function SleepCard({ sleep }: { sleep?: SleepRecord }) {
  if (!sleep) {
    return (
      <MetricCard title="Sleep">
        <p className="text-2xl font-extrabold tracking-[-0.04em] text-[#090e1d]">No sleep data</p>
        <p className="mt-3 text-sm font-medium leading-6 text-[#3d4966]">
          Import Apple Health sleep records to include sleep in daily readiness. No placeholder sleep score is shown.
        </p>
      </MetricCard>
    );
  }

  return (
    <MetricCard title="Sleep">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-5xl font-extrabold tracking-[-0.05em] text-[#090e1d]">{sleep.score}</p>
          <p className="mt-2 text-sm font-semibold text-[#818ba0]">
            {sleep.date} · {formatMinutes(sleep.durationMinutes)}
          </p>
        </div>
        <StatusBadge
          label={sleep.scoreEstimated ? "Estimated" : quality(sleep.score)}
          tone={sleep.scoreEstimated ? "neutral" : sleep.score >= 70 ? "green" : "amber"}
        />
      </div>
      <div className="mt-5 flex h-14 items-end gap-2">
        {[28, 42, 36, 52, 46, 24, 32, 40].map((height, index) => (
          <div key={index} className="flex-1 rounded-t-md bg-[#43c9cc]" style={{ height: `${height}px`, opacity: index === 3 ? 1 : 0.55 }} />
        ))}
      </div>
      <p className="mt-5 text-sm font-medium leading-6 text-[#3d4966]">
        {sleep.scoreEstimated
          ? "No imported sleep score was found, so this is a duration-based estimate. Respiratory rate is shown only as a baseline factor, not a diagnosis."
          : "Sleep score is taken from the imported health data. Respiratory rate is shown only as a baseline factor, not a diagnosis."}
      </p>
    </MetricCard>
  );
}
