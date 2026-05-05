import Link from "next/link";
import { LoadStatusCard } from "@/components/dashboard/LoadStatusCard";
import { RecentWorkouts } from "@/components/dashboard/RecentWorkouts";
import { RecoveryCard } from "@/components/dashboard/RecoveryCard";
import { SleepCard } from "@/components/dashboard/SleepCard";
import { TodayRecommendationCard } from "@/components/dashboard/TodayRecommendationCard";
import { Vo2MaxCard } from "@/components/dashboard/Vo2MaxCard";
import { getHealthSnapshot } from "@/lib/health/api-data";
import { getDaysBetween, getEffectiveToday, getWeekStart } from "@/lib/health/dates";
import { calculateAcuteLoad, calculateChronicLoad, calculateTrainingLoadStatus } from "@/lib/health/load";
import { generateWeeklyPlan } from "@/lib/health/plan";
import { generateTodayRecommendation } from "@/lib/health/recommendation";
import { calculatePreviousDayLoad, calculateRecoveryScore } from "@/lib/health/recovery";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getHealthSnapshot();
  if (data.meta && !data.meta.hasRealData) {
    return <NoHealthDataDashboard source={data.source} />;
  }

  const daily = getEffectiveToday(data);
  const acuteLoad = calculateAcuteLoad(data.workouts, daily.today);
  const chronic = calculateChronicLoad(data.workouts, daily.today);
  const loadStatus = calculateTrainingLoadStatus(acuteLoad, chronic.chronicLoad, chronic.hasEnoughBaseline);
  const todaySleep = data.sleep.find((record) => record.date === daily.today) ?? data.sleep.at(-1);
  const todayRecovery = data.recovery.find((record) => record.date === daily.today) ?? data.recovery.at(-1);
  const recovery = calculateRecoveryScore({
    sleep: todaySleep,
    recovery: todayRecovery,
    settings: data.settings,
    previousDayLoad: calculatePreviousDayLoad(data.workouts, daily.today),
    weeklyLoad: acuteLoad,
    chronicLoad: chronic.chronicLoad,
  });
  const plan = generateWeeklyPlan({
    weekStart: getWeekStart(daily.today),
    loadStatus: loadStatus.status,
    recoveryScore: recovery.score,
    sleepScore: todaySleep?.score ?? recovery.score,
    previousWeekDistanceKm: 18.4,
    settings: data.settings,
    recentWorkouts: data.workouts,
  });
  const plannedToday = plan.find((day) => day.date === daily.today);
  const recentHardWorkout = data.workouts.filter((workout) => workout.zones.z4 + workout.zones.z5 >= 10).sort((a, b) => b.date.localeCompare(a.date))[0];
  const recommendation = generateTodayRecommendation({
    plannedWorkout: plannedToday,
    recoveryScore: recovery.score,
    sleepScore: todaySleep?.score ?? recovery.score,
    loadStatus: loadStatus.status,
    recentHardWorkoutDaysAgo: recentHardWorkout ? getDaysBetween(recentHardWorkout.date, daily.today) : undefined,
    injuryNotes: data.settings.injuryNotes,
    settings: data.settings,
  });
  const recentWorkouts = [...data.workouts]
    .filter((workout) => {
      const age = getDaysBetween(workout.date, daily.today);
      return age >= 0 && age < 7;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid gap-5 xl:grid-cols-[365px_1fr]">
      <div className="space-y-5">
        <TodayRecommendationCard recommendation={recommendation} />
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-[#090e1d] lg:text-4xl">Running health metrics</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-14 min-w-[320px] items-center gap-3 rounded-xl bg-[#dce1e8] px-4 text-sm font-semibold text-[#3d4966] md:flex">
              <Icon name="search" className="size-5 text-[#090e1d]" />
              Search anything...
            </div>
            <Link href="/insights" className="flex h-14 items-center rounded-xl border border-[#bec5d2] px-4 text-sm font-extrabold text-[#3d4966] hover:bg-white">
              Weekly Insights
            </Link>
            <Link href="/settings" className="flex size-14 items-center justify-center rounded-xl border border-[#bec5d2] text-[#3d4966] hover:bg-white" aria-label="Settings">
              <Icon name="settings" />
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <RecoveryCard score={recovery.score} estimated={recovery.estimated} factors={recovery.factors} />
          <SleepCard sleep={todaySleep} />
          <LoadStatusCard status={loadStatus.status} acuteLoad={acuteLoad} chronicLoad={chronic.chronicLoad} ratio={loadStatus.ratio} approximate={chronic.isApproximate} />
          <Vo2MaxCard points={data.vo2Max} />
          <RecentWorkouts workouts={recentWorkouts} />
        </div>
      </div>
    </div>
  );
}

function NoHealthDataDashboard({ source }: { source: string }) {
  return (
    <section className="ask-card p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Dashboard</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-[-0.05em] text-[#090e1d]">
        Waiting for real health data.
      </h1>
      <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">
        Source is {source}, but the database has no imported workouts or daily recovery rows yet. Import Apple Health export data first; the dashboard will not show mock recovery, sleep, or load values in production.
      </p>
      <Link href="/settings" className="mt-6 inline-flex rounded-xl bg-[#0f67fe] px-5 py-3 text-sm font-extrabold text-white">
        Open data settings
      </Link>
    </section>
  );
}
