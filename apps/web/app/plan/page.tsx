import { HealthDataUnavailable } from "@/components/health/HealthDataUnavailable";
import { PlanRationale } from "@/components/plan/PlanRationale";
import { WeeklyPlan } from "@/components/plan/WeeklyPlan";
import { getHealthSnapshot, isMissingAdminApiKeyError } from "@/lib/health/api-data";
import { getEffectiveToday, getWeekStart } from "@/lib/health/dates";
import { calculateAcuteLoad, calculateChronicLoad, calculateTrainingLoadStatus } from "@/lib/health/load";
import { getTrainingPlanOverride } from "@/lib/health/plan-overrides";
import { generatePlanRationale, generateWeeklyPlan } from "@/lib/health/plan";
import { calculatePreviousDayLoad, calculateRecoveryScore } from "@/lib/health/recovery";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  let data;
  try {
    data = await getHealthSnapshot();
  } catch (cause) {
    if (isMissingAdminApiKeyError(cause)) {
      return (
        <HealthDataUnavailable
          title="Training plan data is unavailable."
          message="Set ADMIN_API_KEY in the web runtime environment before generating a plan from real backend health data."
        />
      );
    }
    throw cause;
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
  const override = await getTrainingPlanOverride(input.weekStart);
  const completed = new Set((data.completions ?? []).map((item) => `${item.date}:${item.workoutType}`));
  const displayPlan = override?.days ?? plan;
  const planWithCompletions = displayPlan.map((day) =>
    completed.has(`${day.date}:${day.workoutType}`) ? { ...day, status: "completed" as const } : day,
  );
  const rationale = override?.rationale ?? generatePlanRationale(input);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Weekly Plan</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-[#090e1d]">
          {override ? "Updated from coach chat." : "Conservative week, one possible quality day."}
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">
          {override
            ? `Coach chat updated this week on ${new Date(override.updatedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}. Safety rules still come from deterministic training logic.`
            : `Generated for the current runner profile. Max one interval session, mostly Zone 2, no aggressive volume jumps. ${daily.note}`}
        </p>
      </div>
      <WeeklyPlan days={planWithCompletions} persistMode={data.source === "backend_api" ? "api" : "local"} />
      <PlanRationale items={rationale} />
    </div>
  );
}
