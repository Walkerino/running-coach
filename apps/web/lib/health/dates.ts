import type { HealthDataSnapshot } from "./types";
import { DEFAULT_TIMEZONE, MOCK_TODAY } from "./types";

export function getTodayInTimezone(timezone = DEFAULT_TIMEZONE, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function getLatestAvailableDate(snapshot: HealthDataSnapshot): string {
  return [...snapshot.sleep, ...snapshot.recovery, ...snapshot.workouts]
    .map((item) => item.date)
    .sort((a, b) => b.localeCompare(a))[0] ?? getTodayInTimezone(snapshot.timezone);
}

export function getEffectiveToday(snapshot: HealthDataSnapshot, now = new Date()): {
  today: string;
  isLiveDate: boolean;
  note: string;
} {
  const liveToday = getTodayInTimezone(snapshot.timezone, now);
  const hasTodayData =
    snapshot.sleep.some((record) => record.date === liveToday) ||
    snapshot.recovery.some((record) => record.date === liveToday) ||
    snapshot.workouts.some((workout) => workout.date === liveToday);

  if (hasTodayData) {
    return {
      today: liveToday,
      isLiveDate: true,
      note: "Updated from today's morning readiness data.",
    };
  }

  return {
    today: getLatestAvailableDate(snapshot),
    isLiveDate: false,
    note: snapshot.source === "mock"
      ? "Demo mode: using the latest available mock readiness day."
      : "Using the latest available database day.",
  };
}

export function getWeekStart(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

export function getDaysBetween(fromDate: string, toDate: string): number {
  return Math.floor((new Date(`${toDate}T12:00:00Z`).getTime() - new Date(`${fromDate}T12:00:00Z`).getTime()) / (24 * 60 * 60 * 1000));
}
