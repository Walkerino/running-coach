import { WeeklySummary } from "@/components/insights/WeeklySummary";
import { getHealthSnapshot } from "@/lib/health/api-data";
import { getDaysBetween, getEffectiveToday } from "@/lib/health/dates";

export const dynamic = "force-dynamic";

function withinLastSevenDays(date: string, today: string): boolean {
  const age = getDaysBetween(date, today);
  return age >= 0 && age < 7;
}

export default async function InsightsPage() {
  const data = await getHealthSnapshot();
  const daily = getEffectiveToday(data);
  const workouts = data.workouts.filter((workout) => withinLastSevenDays(workout.date, daily.today));
  const sleep = data.sleep.filter((record) => withinLastSevenDays(record.date, daily.today));
  const recovery = data.recovery.filter((record) => withinLastSevenDays(record.date, daily.today));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Weekly Insights</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-[#090e1d]">April 29 - May 5</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">A compact weekly readout. This page stays outside the main navigation to keep the dashboard focused.</p>
      </div>
      <WeeklySummary workouts={workouts} sleep={sleep} recovery={recovery} />
    </div>
  );
}
