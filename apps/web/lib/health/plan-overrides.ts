import { apiFetch, shouldUseLocalMockDataFallback, shouldUseMockHealthData } from "./api-data";
import type { TrainingPlanDay, TrainingPlanOverride } from "./types";

type PlanChangeResult = {
  override: TrainingPlanOverride;
  summary: string;
};

const dayAliases: Array<[number, string[]]> = [
  [0, ["monday", "mon", "понедельник", "понедельника", "пн"]],
  [1, ["tuesday", "tue", "вторник", "вторника", "вт"]],
  [2, ["wednesday", "wed", "среда", "среду", "среды", "ср"]],
  [3, ["thursday", "thu", "четверг", "четверга", "чт"]],
  [4, ["friday", "fri", "пятница", "пятницу", "пятницы", "пт"]],
  [5, ["saturday", "sat", "суббота", "субботу", "субботы", "сб"]],
  [6, ["sunday", "sun", "воскресенье", "воскресенья", "вс"]],
];

function isRunDay(day: TrainingPlanDay) {
  return day.workoutType === "easy_run" || day.workoutType === "recovery_run" || day.workoutType === "long_easy_run" || day.workoutType === "intervals";
}

async function localOverrideFilePath() {
  const path = await import("node:path");
  return path.join(process.cwd(), ".next", "cache", "running-coach-plan-overrides.json");
}

async function readLocalOverrides(): Promise<Record<string, TrainingPlanOverride>> {
  const fs = await import("node:fs/promises");
  const filePath = await localOverrideFilePath();

  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as Record<string, TrainingPlanOverride>;
  } catch (cause) {
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT") {
      return {};
    }
    throw cause;
  }
}

async function writeLocalOverrides(overrides: Record<string, TrainingPlanOverride>) {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const filePath = await localOverrideFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(overrides, null, 2));
}

function clonePlan(plan: TrainingPlanDay[]) {
  return plan.map((day) => ({ ...day }));
}

function mentionedDays(message: string) {
  const normalized = message.toLowerCase();
  const days = dayAliases
    .filter(([, aliases]) => aliases.some((alias) => new RegExp(`(^|[^a-zа-яё])${alias}([^a-zа-яё]|$)`, "i").test(normalized)))
    .map(([index]) => index);
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

function hasAny(message: string, words: string[]) {
  const normalized = message.toLowerCase();
  return words.some((word) => normalized.includes(word));
}

function toEasyRun(day: TrainingPlanDay, reason: string): TrainingPlanDay {
  const duration = Math.min(day.durationMinutes ?? 35, 35);
  return {
    ...day,
    workoutType: "easy_run",
    title: "Easy Run",
    durationMinutes: duration,
    distanceKm: day.distanceKm ? Math.min(day.distanceKm, 4.2) : undefined,
    targetZone: "Z2",
    description: `${duration} min relaxed aerobic run.`,
    coachNote: reason,
    status: day.status === "skip" ? "adjust" : day.status,
  };
}

function toRest(day: TrainingPlanDay, reason: string): TrainingPlanDay {
  return {
    ...day,
    workoutType: "rest",
    title: "Rest Day",
    durationMinutes: undefined,
    distanceKm: undefined,
    targetZone: undefined,
    targetHrRange: undefined,
    description: "No run planned. Optional walk or light mobility.",
    coachNote: reason,
    status: "ready",
  };
}

function makePlanEasier(plan: TrainingPlanDay[]) {
  return plan.map((day) => {
    if (day.workoutType === "intervals") {
      return toEasyRun(day, "Adjusted from intervals after your chat preference.");
    }
    if (!isRunDay(day) || !day.durationMinutes) return day;
    const duration = Math.max(20, Math.round(day.durationMinutes * 0.85 / 5) * 5);
    const status: TrainingPlanDay["status"] = day.status === "skip" ? "skip" : "adjust";
    return {
      ...day,
      durationMinutes: duration,
      distanceKm: day.distanceKm ? Number((day.distanceKm * 0.85).toFixed(1)) : undefined,
      description: `${duration} min easy, conservative effort.`,
      coachNote: "Reduced after your chat preference; keep effort comfortable.",
      status,
    };
  });
}

function moveRunDaysToPreferred(plan: TrainingPlanDay[], preferredDayIndexes: number[]) {
  const sessions = plan.filter(isRunDay);
  let sessionIndex = 0;

  return plan.map((day, index) => {
    if (!preferredDayIndexes.includes(index)) {
      return isRunDay(day) ? toRest(day, "Moved running away from this day after your chat preference.") : day;
    }

    const session = sessions[sessionIndex];
    sessionIndex += 1;
    if (!session) return day;

    return {
      ...session,
      date: day.date,
      dayName: day.dayName,
      coachNote: `${session.coachNote} Scheduled on your preferred day.`,
    };
  });
}

function moveLongRun(plan: TrainingPlanDay[], targetDayIndex: number) {
  const sourceIndex = plan.findIndex((day) => day.workoutType === "long_easy_run");
  if (sourceIndex < 0 || sourceIndex === targetDayIndex) return plan;

  const next = clonePlan(plan);
  const source = next[sourceIndex];
  const target = next[targetDayIndex];
  next[targetDayIndex] = {
    ...source,
    date: target.date,
    dayName: target.dayName,
    coachNote: "Moved here after your chat preference; keep it easy.",
  };
  next[sourceIndex] = toRest(source, "Long run moved away from this day after your chat preference.");
  return next;
}

export function buildPlanChangeOverride(input: {
  basePlan: TrainingPlanDay[];
  message: string;
  weekStart: string;
  source: TrainingPlanOverride["source"];
}): PlanChangeResult | null {
  const message = input.message.toLowerCase();
  const wantsPlanChange = hasAny(message, ["план", "недел", "week", "plan", "workout", "трен", "бег", "run", "running"]) &&
    hasAny(message, [
      "обнов",
      "помен",
      "измени",
      "перенеси",
      "постав",
      "сделай",
      "назнач",
      "убери",
      "замени",
      "adjust",
      "change",
      "move",
      "set",
      "make",
      "remove",
      "prefer",
      "предпоч",
    ]);

  if (!wantsPlanChange) return null;

  let plan = clonePlan(input.basePlan);
  const changes: string[] = [];
  const days = mentionedDays(message);

  if (hasAny(message, ["без интервал", "убери интервал", "no interval", "remove interval", "skip interval"])) {
    plan = plan.map((day) => day.workoutType === "intervals" ? toEasyRun(day, "Intervals removed after your chat preference.") : day);
    changes.push("removed intervals");
  }

  if (hasAny(message, ["легче", "полегче", "лайт", "easier", "lighter", "easy week"])) {
    plan = makePlanEasier(plan);
    changes.push("made the week easier");
  }

  if (days.length >= 2 && hasAny(message, ["предпоч", "удоб", "только", "prefer", "preferred", "only"])) {
    plan = moveRunDaysToPreferred(plan, days);
    changes.push(`moved runs to ${days.map((index) => input.basePlan[index].dayName).join(", ")}`);
  }

  if (days.length === 1 && hasAny(message, ["длин", "лонг", "long"])) {
    plan = moveLongRun(plan, days[0]);
    changes.push(`moved the long run to ${input.basePlan[days[0]].dayName}`);
  }

  if (days.length === 1 && hasAny(message, ["отдых", "rest"])) {
    plan = plan.map((day, index) => index === days[0] ? toRest(day, "Rest day set after your chat preference.") : day);
    changes.push(`set ${input.basePlan[days[0]].dayName} as rest`);
  }

  if (changes.length === 0) return null;

  return {
    override: {
      weekStart: input.weekStart,
      days: plan,
      rationale: [
        "Updated from coach chat preferences.",
        "The plan keeps deterministic training-engine safety limits; the chat layer does not invent health data.",
        ...changes.map((change) => `Preference applied: ${change}.`),
      ],
      source: input.source,
      updatedAt: new Date().toISOString(),
    },
    summary: changes.join(", "),
  };
}

export async function getTrainingPlanOverride(weekStart: string): Promise<TrainingPlanOverride | null> {
  if (shouldUseMockHealthData()) {
    const overrides = await readLocalOverrides();
    return overrides[weekStart] ?? null;
  }

  const response = await apiFetch(`/web/training-plan-override?weekStart=${encodeURIComponent(weekStart)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load training plan override: ${response.status}`);
  return response.json() as Promise<TrainingPlanOverride>;
}

export async function saveTrainingPlanOverride(override: TrainingPlanOverride) {
  if (shouldUseMockHealthData() || shouldUseLocalMockDataFallback()) {
    const overrides = await readLocalOverrides();
    overrides[override.weekStart] = override;
    await writeLocalOverrides(overrides);
    return override;
  }

  const response = await apiFetch("/web/training-plan-override", {
    method: "POST",
    body: JSON.stringify(override),
  });
  if (!response.ok) throw new Error(`Failed to save training plan override: ${response.status}`);
  return response.json() as Promise<TrainingPlanOverride>;
}
