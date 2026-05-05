"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TrainingPlanDay } from "@/lib/health/types";
import { StatusBadge } from "@/components/dashboard/MetricCard";
import { getPlanStatusLabel } from "@/lib/health/status-labels";
import { Icon } from "@/components/ui/Icon";

function statusTone(status: TrainingPlanDay["status"]) {
  if (status === "ready" || status === "completed") return "green";
  if (status === "adjust") return "amber";
  return "red";
}

export function TrainingDayCard({ day, persistMode }: { day: TrainingPlanDay; persistMode: "api" | "local" }) {
  const storageKey = `running-coach:completed:${day.date}:${day.workoutType}`;
  const [completed, setCompleted] = useState(day.status === "completed");
  const [justCompleted, setJustCompleted] = useState(false);
  const displayStatus = completed ? "completed" : day.status;

  useEffect(() => {
    setCompleted(window.localStorage.getItem(storageKey) === "true" || day.status === "completed");
  }, [day.status, storageKey]);

  async function toggleCompleted() {
    const next = !completed;
    setCompleted(next);

    try {
      if (persistMode === "api") {
        const response = await fetch("/api/training-completions", {
          method: next ? "POST" : "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            date: day.date,
            workoutType: day.workoutType,
            title: day.title,
          }),
        });
        if (!response.ok) throw new Error("Failed to update completion");
      } else {
        window.localStorage.setItem(storageKey, String(next));
      }

      if (next) {
        setJustCompleted(true);
        window.setTimeout(() => setJustCompleted(false), 900);
      }
    } catch {
      setCompleted(!next);
    }
  }

  return (
    <article
      className={cn(
        "ask-card relative overflow-hidden p-5 transition duration-300",
        day.workoutType === "intervals" && "ring-2 ring-[#0f67fe]",
        completed && "bg-[#e7fff8] ring-2 ring-[#37d49b]",
        justCompleted && "complete-pop",
      )}
    >
      {justCompleted ? (
        <div className="pointer-events-none absolute inset-0">
          <span className="complete-spark left-[18%] top-[18%]" />
          <span className="complete-spark left-[74%] top-[20%]" />
          <span className="complete-spark left-[58%] top-[72%]" />
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#818ba0]">{day.dayName}</p>
          <h3 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-[#090e1d]">{day.title}</h3>
        </div>
        <StatusBadge label={getPlanStatusLabel(displayStatus)} tone={statusTone(displayStatus)} />
      </div>
      <p className="mt-4 text-sm font-medium leading-6 text-[#3d4966]">{day.description}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-[#3d4966]">
        {day.durationMinutes ? <span className="rounded-lg bg-[#f2f5f9] px-3 py-1">{day.durationMinutes} min</span> : null}
        {day.distanceKm ? <span className="rounded-lg bg-[#f2f5f9] px-3 py-1">{day.distanceKm.toFixed(1)} km</span> : null}
        {day.targetZone ? <span className="rounded-lg bg-[#edf5ff] px-3 py-1 text-[#0f67fe]">{day.targetZone}</span> : null}
        {day.targetHrRange ? <span className="rounded-lg bg-[#f2f5f9] px-3 py-1">{day.targetHrRange}</span> : null}
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-[#818ba0]">AI note: {day.coachNote}</p>
      {day.workoutType !== "rest" ? (
        <button
          type="button"
          onClick={toggleCompleted}
          className={cn(
            "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition",
            completed ? "bg-[#0b8b64] text-white" : "bg-[#0f67fe] text-white shadow-[0_8px_16px_rgba(15,103,254,0.24)]",
          )}
        >
          <Icon name={completed ? "shield" : "plus"} className="size-5" />
          {completed ? "Completed" : "Mark completed"}
        </button>
      ) : null}
    </article>
  );
}
