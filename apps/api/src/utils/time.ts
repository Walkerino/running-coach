import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import { env } from "../config/env.js";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

function hasExplicitTimezone(value: string) {
  return /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value.trim());
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export function toAppDate(value: string | Date, timezoneName = env.APP_TIMEZONE): Date {
  if (value instanceof Date) {
    return dayjs(value).tz(timezoneName).startOf("day").toDate();
  }

  const trimmed = value.trim();
  if (isDateOnly(trimmed)) {
    return dayjs.tz(trimmed, "YYYY-MM-DD", timezoneName).startOf("day").toDate();
  }

  const parsed = hasExplicitTimezone(trimmed) ? dayjs(trimmed) : dayjs.tz(trimmed, timezoneName);
  return parsed.tz(timezoneName).startOf("day").toDate();
}

export function toAppDateTime(value: string | Date, timezoneName = env.APP_TIMEZONE): Date {
  if (value instanceof Date) {
    return value;
  }

  const trimmed = value.trim();
  if (isDateOnly(trimmed)) {
    return dayjs.tz(trimmed, "YYYY-MM-DD", timezoneName).startOf("day").toDate();
  }

  return (hasExplicitTimezone(trimmed) ? dayjs(trimmed) : dayjs.tz(trimmed, timezoneName)).toDate();
}

export function formatAppDate(value: string | Date, timezoneName = env.APP_TIMEZONE): string {
  return dayjs(value).tz(timezoneName).format("YYYY-MM-DD");
}

export function formatAppDateTime(value: string | Date, timezoneName = env.APP_TIMEZONE): string {
  return dayjs(value).tz(timezoneName).format();
}

export function daysAgo(days: number): Date {
  return dayjs().tz(env.APP_TIMEZONE).subtract(days, "day").toDate();
}

export function startOfToday(timezoneName = env.APP_TIMEZONE): Date {
  return dayjs().tz(timezoneName).startOf("day").toDate();
}

export function now(): Date {
  return dayjs().toDate();
}
