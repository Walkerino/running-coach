import type { TrainingPlanDay } from "@/lib/health/types";
import { TrainingDayCard } from "./TrainingDayCard";

export function WeeklyPlan({ days, persistMode }: { days: TrainingPlanDay[]; persistMode: "api" | "local" }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {days.map((day) => (
        <TrainingDayCard key={day.date} day={day} persistMode={persistMode} />
      ))}
    </section>
  );
}
