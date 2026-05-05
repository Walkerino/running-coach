import type { RecoveryRecord, SleepRecord, Workout } from "@/lib/health/types";
import { MetricCard } from "@/components/dashboard/MetricCard";

export function WeeklySummary({ workouts, sleep, recovery }: { workouts: Workout[]; sleep: SleepRecord[]; recovery: RecoveryRecord[] }) {
  const totalDistance = workouts.reduce((sum, workout) => sum + (workout.distanceKm ?? 0), 0);
  const totalLoad = workouts.reduce((sum, workout) => sum + workout.load, 0);
  const hardMinutes = workouts.reduce((sum, workout) => sum + workout.zones.z4 + workout.zones.z5, 0);
  const totalMinutes = workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0);
  const easyShare = Math.round((1 - hardMinutes / Math.max(totalMinutes, 1)) * 100);
  const longest = workouts.reduce((max, workout) => Math.max(max, workout.distanceKm ?? 0), 0);
  const avgSleep = Math.round(sleep.reduce((sum, record) => sum + record.score, 0) / Math.max(sleep.length, 1));
  const avgRecovery = Math.round(recovery.reduce((sum, record) => sum + record.score, 0) / Math.max(recovery.length, 1));
  const lowRecoveryDays = recovery.filter((record) => record.score < 65).length;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <MetricCard title="Running" eyebrow="April 29 - May 5">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Workouts" value={String(workouts.length)} />
          <Stat label="Distance" value={`${totalDistance.toFixed(1)} km`} />
          <Stat label="Easy intensity" value={`${easyShare}%`} />
          <Stat label="Longest run" value={`${longest.toFixed(1)} km`} />
        </div>
        <p className="mt-5 text-sm font-medium leading-6 text-[#3d4966]">Total training load: {totalLoad}. Good consistency with mostly easy work.</p>
      </MetricCard>
      <MetricCard title="Recovery">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Sleep avg" value={String(avgSleep)} />
          <Stat label="Recovery avg" value={String(avgRecovery)} />
          <Stat label="Low days" value={String(lowRecoveryDays)} />
          <Stat label="Adjustment" value="Keep easy" />
        </div>
        <p className="mt-5 text-sm font-medium leading-6 text-[#3d4966]">Do not increase volume next week by more than 10%. Add one VO2 max interval session only if recovery remains stable.</p>
      </MetricCard>
      <MetricCard title="What improved">
        <p className="text-sm font-medium leading-6 text-[#3d4966]">Consistency improved and long run progressed carefully without turning into a hard effort.</p>
      </MetricCard>
      <MetricCard title="What to adjust next week">
        <p className="text-sm font-medium leading-6 text-[#3d4966]">Keep the long run easy, avoid extra intensity, and use sleep/recovery to decide whether Friday intervals stay in the plan.</p>
      </MetricCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f2f5f9] p-4">
      <p className="text-sm font-bold text-[#818ba0]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-[#090e1d]">{value}</p>
    </div>
  );
}
