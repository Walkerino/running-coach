import { getRecoveryLabel } from "@/lib/health/recovery";
import { MetricCard, StatusBadge } from "./MetricCard";

export function RecoveryCard({ score, estimated, factors }: { score: number; estimated: boolean; factors: string[] }) {
  return (
    <MetricCard title="Recovery" eyebrow="Coaching estimate">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-5xl font-extrabold tracking-[-0.05em] text-[#090e1d]">{score}</p>
          <p className="mt-2 text-sm font-semibold text-[#818ba0]">{getRecoveryLabel(score)} readiness</p>
        </div>
        <StatusBadge label={estimated ? "Estimated" : "Complete"} tone={score >= 65 ? "green" : "amber"} />
      </div>
      <div className="mt-5 h-3 rounded-full bg-[#edf5ff]">
        <div className="metric-bar h-3 rounded-full bg-[#0f67fe]" style={{ width: `${score}%` }} />
      </div>
      <p className="mt-4 text-sm font-medium leading-6 text-[#3d4966]">{factors[0]} This is not a medical diagnosis.</p>
    </MetricCard>
  );
}
