export const DEFAULT_TIMEZONE = "Europe/Helsinki";
export const MOCK_TODAY = "2026-05-05";

export type WorkoutType = "run" | "walk" | "strength" | "cycling" | "mobility" | "other";

export type ZoneMinutes = {
  z1: number;
  z2: number;
  z3: number;
  z4: number;
  z5: number;
};

export type HrZoneKey = keyof ZoneMinutes;

export type HrZoneRange = {
  min: number;
  max: number;
};

export type HrZones = Record<HrZoneKey, HrZoneRange>;

export type Workout = {
  id: string;
  userId: string;
  date: string;
  type: WorkoutType;
  title: string;
  durationMinutes: number;
  distanceKm?: number;
  avgPace?: string;
  avgHeartRate?: number;
  maxHeartRate?: number;
  zones: ZoneMinutes;
  load: number;
  source: "apple_health" | "strava" | "manual" | "mock";
  notes?: string;
};

export type SleepRecord = {
  date: string;
  score: number;
  durationMinutes: number;
  interruptions?: number;
  respiratoryRate?: number;
};

export type RecoveryRecord = {
  date: string;
  score: number;
  restingHeartRate?: number;
  hrv?: number;
  respiratoryRate?: number;
  note?: string;
};

export type BodyMetric = {
  date: string;
  weightKg: number;
  heightCm: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  thighCm?: number;
  armCm?: number;
};

export type TrainingPlanDay = {
  date: string;
  dayName: string;
  workoutType:
    | "easy_run"
    | "recovery_run"
    | "long_easy_run"
    | "intervals"
    | "rest"
    | "mobility_strength";
  title: string;
  durationMinutes?: number;
  distanceKm?: number;
  targetZone?: "Z1" | "Z2" | "Z3" | "Z4" | "Z5";
  targetHrRange?: string;
  description: string;
  coachNote: string;
  status: "ready" | "adjust" | "skip" | "completed";
};

export type UserSettings = {
  goal: string;
  age: number;
  heightCm?: number;
  weightKg?: number;
  hrMax: number;
  preferredEasyHrRange: string;
  weeklyRunFrequency: number;
  longRunLimitMinutes: number;
  preferredWorkoutDays: string[];
  unavailableDays: string[];
  injuryNotes?: string;
  restingHeartRateBaseline?: number;
  hrvBaseline?: number;
  respiratoryRateBaseline?: number;
  hrZones: HrZones;
};

export type TrainingLoadStatus =
  | "well_below"
  | "below"
  | "steady"
  | "above"
  | "well_above"
  | "building_baseline";

export type TodayRecommendation = {
  title: string;
  workoutType: string;
  durationMinutes?: number;
  targetZone?: string;
  targetHrRange?: string;
  status: "ready" | "adjust" | "skip" | "completed";
  reason: string;
};

export type Vo2MaxPoint = {
  date: string;
  value: number;
};

export type HeartRateSample = {
  timestamp?: string;
  start?: string;
  end?: string;
  bpm: number;
};

export type HealthDataSourceName = "apple_health_export" | "strava" | "manual" | "backend_api" | "mock";

export type HealthDataSnapshot = {
  source: HealthDataSourceName;
  timezone: string;
  user?: {
    id: string;
    telegramId?: string;
  };
  workouts: Workout[];
  sleep: SleepRecord[];
  recovery: RecoveryRecord[];
  body: BodyMetric[];
  vo2Max: Vo2MaxPoint[];
  settings: UserSettings;
  completions?: Array<{
    date: string;
    workoutType: TrainingPlanDay["workoutType"] | string;
    title?: string | null;
    completedAt: string;
  }>;
  meta?: {
    hasRealData: boolean;
    workoutCount: number;
    dailyCount: number;
    generatedAt: string;
  };
};

export interface HealthDataSource {
  name: HealthDataSourceName;
  getSnapshot(): Promise<HealthDataSnapshot>;
}
