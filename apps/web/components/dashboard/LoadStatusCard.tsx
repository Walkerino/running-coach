import { formatSigned } from "@/lib/utils";
import { getLoadStatusLabel, getLoadStatusRecommendation } from "@/lib/health/load";
import type { TrainingLoadStatus } from "@/lib/health/types";
import { MetricCard, StatusBadge } from "./MetricCard";

export function LoadStatusCard({
  status,
  acuteLoad,
  chronicLoad,
  ratio,
  approximate,
}: {
  status: TrainingLoadStatus;
  acuteLoad: number;
  chronicLoad: number;
  ratio: number | null;
  approximate: boolean;
}) {
  const diff = ratio === null ? null : (ratio - 1) * 100;
  const tone = status === "steady" || status === "below" ? "green" : status === "above" || status === "building_baseline" ? "amber" : "red";

  return (
    <MetricCard title="Load Status" eyebrow="Based on heart rate zones">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-3xl font-extrabold tracking-[-0.04em] text-[#090e1d]">{getLoadStatusLabel(status)}</p>
          <p className="mt-2 text-sm font-semibold text-[#818ba0]">{approximate ? "Approximate baseline" : "28-day baseline ready"}</p>
        </div>
        <StatusBadge label={status === "building_baseline" ? "Estimated" : "Coach Load"} tone={tone} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-[#f2f5f9] p-3">
          <p className="font-bold text-[#818ba0]">7-day</p>
          <p className="mt-1 text-xl font-extrabold text-[#090e1d]">{acuteLoad}</p>
        </div>
        <div className="rounded-xl bg-[#f2f5f9] p-3">
          <p className="font-bold text-[#818ba0]">Baseline</p>
          <p className="mt-1 text-xl font-extrabold text-[#090e1d]">{chronicLoad}/wk</p>
        </div>
        <div className="rounded-xl bg-[#f2f5f9] p-3">
          <p className="font-bold text-[#818ba0]">Diff</p>
          <p className="mt-1 text-xl font-extrabold text-[#090e1d]">{diff === null ? "-" : `${formatSigned(diff, 0)}%`}</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium leading-6 text-[#3d4966]">Coach: {getLoadStatusRecommendation(status)}</p>
    </MetricCard>
  );
}
