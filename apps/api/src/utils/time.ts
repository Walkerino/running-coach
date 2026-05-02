import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import { env } from "../config/env.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export function toAppDate(value: string | Date, timezoneName = env.APP_TIMEZONE): Date {
  return dayjs(value).tz(timezoneName).startOf("day").toDate();
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
