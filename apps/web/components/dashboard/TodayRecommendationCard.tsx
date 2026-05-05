import { StatusBadge } from "./MetricCard";
import type { TodayRecommendation } from "@/lib/health/types";
import { Icon } from "@/components/ui/Icon";
import { getRecommendationStatusLabel } from "@/lib/health/status-labels";

function tone(status: TodayRecommendation["status"]) {
  if (status === "ready" || status === "completed") return "green";
  if (status === "adjust") return "amber";
  return "red";
}

export function TodayRecommendationCard({ recommendation }: { recommendation: TodayRecommendation }) {
  return (
    <section className="surface-panel relative overflow-hidden rounded-3xl bg-[#0f67fe] p-5 text-white shadow-[0_20px_40px_rgba(15,103,254,0.28)] lg:min-h-[360px] lg:p-6">
      <div className="absolute -right-20 -top-24 size-72 rounded-full bg-white/10" />
      <div className="absolute -bottom-28 left-8 size-80 rounded-full bg-[#001441]/12" />
      <div className="relative flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/70">Today&apos;s Recommendation</p>
          <h2 className="mt-4 max-w-xl break-words text-3xl font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-4xl lg:text-5xl">{recommendation.title}</h2>
        </div>
        <StatusBadge label={getRecommendationStatusLabel(recommendation.status)} tone={tone(recommendation.status)} />
      </div>
      <div className="relative mt-8 grid gap-3 md:grid-cols-3">
        <div className="min-w-0 rounded-2xl bg-white/15 p-4 backdrop-blur">
          <Icon name="run" className="size-6 text-white" />
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/65">Workout</p>
          <p className="mt-1 break-words text-base font-extrabold">{recommendation.workoutType}</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white/15 p-4 backdrop-blur">
          <Icon name="calendar" className="size-6 text-white" />
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/65">Duration</p>
          <p className="mt-1 break-words text-base font-extrabold">{recommendation.durationMinutes ? `${recommendation.durationMinutes} min` : "As needed"}</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white/15 p-4 backdrop-blur">
          <Icon name="heart" className="size-6 text-white" />
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/65">Target</p>
          <p className="mt-1 break-words text-base font-extrabold">{[recommendation.targetZone, recommendation.targetHrRange].filter(Boolean).join(" · ") || "Easy effort"}</p>
        </div>
      </div>
      <p className="relative mt-6 max-w-2xl break-words text-sm font-semibold leading-7 text-white/78">Reason: {recommendation.reason}</p>
    </section>
  );
}
