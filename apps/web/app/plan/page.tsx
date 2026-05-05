import { PlanRationale } from "@/components/plan/PlanRationale";
import { WeeklyPlan } from "@/components/plan/WeeklyPlan";
import { getHealthSnapshot } from "@/lib/health/api-data";
import { getEffectiveToday, getWeekStart } from "@/lib/health/dates";
import { calculateAcuteLoad, calculateChronicLoad, calculateTrainingLoadStatus } from "@/lib/health/load";
import { generatePlanRationale, generateWeeklyPlan } from "@/lib/health/plan";
import { calculatePreviousDayLoad, calculateRecoveryScore } from "@/lib/health/recovery";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const data = await getHealthSnapshot();
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
  const input = {
    weekStart: getWeekStart(daily.today),
    loadStatus: loadStatus.status,
    recoveryScore: recovery.score,
    sleepScore: todaySleep?.score ?? recovery.score,
    previousWeekDistanceKm: 18.4,
    settings: data.settings,
    recentWorkouts: data.workouts,
  };
  const plan = generateWeeklyPlan(input);
  const completed = new Set((data.completions ?? []).map((item) => `${item.date}:${item.workoutType}`));
  const planWithCompletions = plan.map((day) =>
    completed.has(`${day.date}:${day.workoutType}`) ? { ...day, status: "completed" as const } : day,
  );
  const rationale = generatePlanRationale(input);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Weekly Plan</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Conservative week, one possible quality day.</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">Generated for the current runner profile. Max one interval session, mostly Zone 2, no aggressive volume jumps. {daily.note}</p>
      </div>
      <WeeklyPlan days={planWithCompletions} persistMode={data.source === "backend_api" ? "api" : "local"} />
      <PlanRationale items={rationale} />
    </div>
  );
}
