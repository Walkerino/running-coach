import type { Workout } from "@/lib/health/types";
import { MetricCard } from "./MetricCard";

function ZoneBar({ workout }: { workout: Workout }) {
  const total = Object.values(workout.zones).reduce((sum, value) => sum + value, 0);
  const colors = ["bg-[#dce1e8]", "bg-[#0f67fe]", "bg-[#43c9cc]", "bg-[#ffb020]", "bg-[#fa4d5e]"];

  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-[#edf5ff]">
      {Object.values(workout.zones).map((minutes, index) => (
        <div key={index} className={colors[index]} style={{ width: `${total > 0 ? (minutes / total) * 100 : 0}%` }} />
      ))}
    </div>
  );
}

export function RecentWorkouts({ workouts }: { workouts: Workout[] }) {
  return (
    <MetricCard title="Recent Workouts" eyebrow="Last 7 days" className="lg:col-span-2">
      <div className="grid gap-3">
        {workouts.length === 0 ? <p className="text-sm font-medium leading-6 text-[#3d4966]">No workouts imported for the last 7 days.</p> : null}
        {workouts.map((workout) => (
          <article key={workout.id} className="rounded-2xl bg-[#f2f5f9] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#818ba0]">{workout.date}</p>
                <h3 className="mt-1 text-lg font-extrabold tracking-[-0.03em] text-[#090e1d]">
                  {workout.title} · {workout.distanceKm ? `${workout.distanceKm.toFixed(1)} km` : "mobility"} · {workout.durationMinutes} min
                </h3>
              </div>
              <p className="rounded-md bg-white px-3 py-1 text-xs font-extrabold text-[#0f67fe]">Load {workout.load}</p>
            </div>
            <p className="mt-3 text-sm font-medium text-[#3d4966]">
              Avg HR {workout.avgHeartRate ?? "-"} · {workout.avgPace ?? "no pace"} · {workout.notes}
            </p>
            <div className="mt-4">
              <ZoneBar workout={workout} />
            </div>
          </article>
        ))}
      </div>
    </MetricCard>
  );
}
