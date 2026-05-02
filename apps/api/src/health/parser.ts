import { toAppDate } from "../utils/time.js";

export type ParsedHealthPayload = {
  metricSamples: Array<{
    metricName: string;
    date: Date;
    units?: string | null;
    qty?: number | null;
    min?: number | null;
    avg?: number | null;
    max?: number | null;
    value?: string | null;
    rawJson: unknown;
  }>;
  daily: Array<{
    date: Date;
    sleepMinutes?: number | null;
    restingHeartRate?: number | null;
    hrvMs?: number | null;
    vo2max?: number | null;
    steps?: number | null;
    activeEnergyKcal?: number | null;
    walkingRunningDistanceMeters?: number | null;
    averageHeartRate?: number | null;
    minHeartRate?: number | null;
    maxHeartRate?: number | null;
    source: string;
    rawJson: unknown;
  }>;
  workouts: Array<{
    date: Date;
    workoutType?: string | null;
    durationSeconds?: number | null;
    distanceMeters?: number | null;
    averageHeartRate?: number | null;
    maxHeartRate?: number | null;
    calories?: number | null;
    rawJson: unknown;
  }>;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readMetric(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (key in obj) {
      const value = asNumber(obj[key]);
      if (value !== null) {
        return value;
      }
    }
  }
  return null;
}

function readQuantityObject(value: unknown): number | null {
  if (typeof value === "object" && value !== null) {
    return asNumber((value as Record<string, unknown>).qty);
  }
  return asNumber(value);
}

function resolveDate(raw: Record<string, unknown>): Date {
  const value =
    raw.date ??
    raw.day ??
    raw.startDate ??
    raw.start_date ??
    raw.localDate ??
    new Date().toISOString();

  return toAppDate(value as string | Date);
}

function rootData(payload: unknown) {
  const root = typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {};
  return typeof root.data === "object" && root.data ? (root.data as Record<string, unknown>) : root;
}

function metricDescriptors(payload: unknown) {
  const data = rootData(payload);
  return Array.isArray(data.metrics) ? data.metrics : [];
}

function workoutDescriptors(payload: unknown) {
  const data = rootData(payload);
  return Array.isArray(data.workouts) ? data.workouts : [];
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function hoursToMinutes(value: number | null) {
  return value == null ? null : Math.round(value * 60);
}

function metersFrom(value: number | null, units: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const normalized = units?.toLowerCase();
  if (normalized === "km") {
    return value * 1000;
  }
  if (normalized === "mi" || normalized === "mile" || normalized === "miles") {
    return value * 1609.344;
  }

  return value;
}

function dailyValueForMetric(metricName: string, point: Record<string, unknown>) {
  switch (metricName) {
    case "sleep_analysis":
      return hoursToMinutes(
        readMetric(point, ["totalSleep", "asleep", "sleepMinutes", "sleep_minutes"]) ??
          asNumber(point.qty),
      );
    case "resting_heart_rate":
      return readMetric(point, ["qty", "Avg", "avg", "average", "restingHeartRate"]);
    case "heart_rate_variability":
    case "heart_rate_variability_sdnn":
    case "hrv":
      return readMetric(point, ["qty", "Avg", "avg", "average", "hrvMs"]);
    case "vo2_max":
    case "vo2max":
      return readMetric(point, ["qty", "vo2max", "vo2Max"]);
    case "step_count":
      return readMetric(point, ["qty", "steps", "stepCount"]);
    case "active_energy":
    case "active_energy_burned":
      return readMetric(point, ["qty", "activeEnergyKcal", "activeEnergy"]);
    case "walking_running_distance":
    case "distance_walking_running":
      return readMetric(point, ["qty", "walkingRunningDistanceMeters", "distanceWalkingRunning"]);
    case "heart_rate":
      return readMetric(point, ["Avg", "avg", "averageHeartRate", "heartRateAverage", "qty"]);
    default:
      return null;
  }
}

function mergeDailyMetric(
  dailyByDate: Map<string, ParsedHealthPayload["daily"][number]>,
  date: Date,
  metricName: string,
  value: number | null,
  units: string | null | undefined,
  rawJson: unknown,
) {
  if (value == null) {
    return;
  }

  const key = dateKey(date);
  const current =
    dailyByDate.get(key) ??
    ({
      date: toAppDate(key),
      source: "health_auto_export",
      rawJson: {},
    } as ParsedHealthPayload["daily"][number]);

  switch (metricName) {
    case "sleep_analysis":
      current.sleepMinutes = value;
      break;
    case "resting_heart_rate":
      current.restingHeartRate = value;
      break;
    case "heart_rate_variability":
    case "heart_rate_variability_sdnn":
    case "hrv":
      current.hrvMs = value;
      break;
    case "vo2_max":
    case "vo2max":
      current.vo2max = value;
      break;
    case "step_count":
      current.steps = Math.round((current.steps ?? 0) + value);
      break;
    case "active_energy":
    case "active_energy_burned":
      current.activeEnergyKcal = (current.activeEnergyKcal ?? 0) + value;
      break;
    case "walking_running_distance":
    case "distance_walking_running":
      current.walkingRunningDistanceMeters = (current.walkingRunningDistanceMeters ?? 0) + (metersFrom(value, units) ?? 0);
      break;
    case "heart_rate":
      current.averageHeartRate = value;
      current.minHeartRate = readMetric(rawJson as Record<string, unknown>, ["Min", "min"]) ?? current.minHeartRate;
      current.maxHeartRate = readMetric(rawJson as Record<string, unknown>, ["Max", "max"]) ?? current.maxHeartRate;
      break;
  }

  current.rawJson = {
    ...(typeof current.rawJson === "object" && current.rawJson ? current.rawJson : {}),
    [metricName]: rawJson,
  };
  dailyByDate.set(key, current);
}

function parseMetricSamples(payload: unknown) {
  const samples: ParsedHealthPayload["metricSamples"] = [];
  const dailyByDate = new Map<string, ParsedHealthPayload["daily"][number]>();

  for (const descriptor of metricDescriptors(payload)) {
    if (typeof descriptor !== "object" || descriptor === null) {
      continue;
    }

    const metric = descriptor as Record<string, unknown>;
    const metricName = asString(metric.name);
    const units = asString(metric.units);
    const points = Array.isArray(metric.data) ? metric.data : [];
    if (!metricName) {
      continue;
    }

    for (const point of points) {
      if (typeof point !== "object" || point === null) {
        continue;
      }

      const rawPoint = point as Record<string, unknown>;
      const date = resolveDate(rawPoint);
      const sample = {
        metricName,
        date,
        units,
        qty: asNumber(rawPoint.qty),
        min: readMetric(rawPoint, ["Min", "min"]),
        avg: readMetric(rawPoint, ["Avg", "avg"]),
        max: readMetric(rawPoint, ["Max", "max"]),
        value: asString(rawPoint.value),
        rawJson: rawPoint,
      };
      samples.push(sample);
      mergeDailyMetric(dailyByDate, date, metricName, dailyValueForMetric(metricName, rawPoint), units, rawPoint);
    }
  }

  return { samples, daily: Array.from(dailyByDate.values()) };
}

function parseLegacyDaily(payload: unknown) {
  const root = typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {};
  const dailyItems = Array.isArray(root.daily) ? root.daily : Array.isArray(root.metrics) ? [] : [payload];

  return dailyItems
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      date: resolveDate(item),
      sleepMinutes: readMetric(item, ["sleepMinutes", "sleep", "sleep_minutes", "sleepInMinutes"]),
      restingHeartRate: readMetric(item, ["restingHeartRate", "resting_hr", "restingHeartRateAvg"]),
      hrvMs: readMetric(item, ["hrvMs", "hrv", "heartRateVariability"]),
      vo2max: readMetric(item, ["vo2max", "vo2Max"]),
      steps: readMetric(item, ["steps", "stepCount"]),
      activeEnergyKcal: readMetric(item, ["activeEnergyKcal", "active_energy", "activeEnergy"]),
      walkingRunningDistanceMeters: readMetric(item, [
        "walkingRunningDistanceMeters",
        "walking_running_distance",
        "distanceWalkingRunning",
      ]),
      averageHeartRate: readMetric(item, ["averageHeartRate", "avgHeartRate", "heartRateAverage"]),
      minHeartRate: readMetric(item, ["minHeartRate", "heartRateMin"]),
      maxHeartRate: readMetric(item, ["maxHeartRate", "heartRateMax"]),
      source: "health_auto_export",
      rawJson: item,
    }))
    .filter((item) =>
      Object.entries(item).some(([key, value]) => key !== "date" && key !== "source" && key !== "rawJson" && value != null),
    );
}

function parseWorkouts(payload: unknown) {
  return workoutDescriptors(payload)
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      date: toAppDate((item.date ?? item.start ?? item.startDate ?? item.start_date) as string | Date),
      workoutType: asString(item.workoutType) ?? asString(item.name) ?? asString(item.activityType),
      durationSeconds: readMetric(item, ["durationSeconds", "duration", "duration_seconds"]),
      distanceMeters: metersFrom(readQuantityObject(item.distance) ?? readMetric(item, ["distanceMeters", "distance"]), asString((item.distance as Record<string, unknown> | undefined)?.units)),
      averageHeartRate:
        readQuantityObject(item.averageHeartRate) ??
        readMetric(item, ["averageHeartRate", "avgHeartRate", "heartRateAverage"]),
      maxHeartRate:
        readQuantityObject(item.maxHeartRate) ??
        readMetric(item, ["maxHeartRate", "heartRateMax"]),
      calories:
        readQuantityObject(item.activeEnergyBurned) ??
        readQuantityObject(item.activeEnergy) ??
        readMetric(item, ["calories", "activeEnergyKcal"]),
      rawJson: item,
    }))
    .filter((item) => Number.isFinite(item.date.getTime()));
}

export function parseHealthPayload(payload: unknown): ParsedHealthPayload {
  const parsedMetrics = parseMetricSamples(payload);
  const legacyDaily = parseLegacyDaily(payload);
  const workouts = parseWorkouts(payload);

  return {
    metricSamples: parsedMetrics.samples,
    daily: [...parsedMetrics.daily, ...legacyDaily],
    workouts,
  };
}
