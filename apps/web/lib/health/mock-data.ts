import { calculateWorkoutLoad } from "./load";
import { getDefaultHrZones } from "./zones";
import type {
  BodyMetric,
  HealthDataSnapshot,
  HealthDataSource,
  RecoveryRecord,
  SleepRecord,
  UserSettings,
  Vo2MaxPoint,
  Workout,
  ZoneMinutes,
} from "./types";
import { DEFAULT_TIMEZONE, MOCK_TODAY } from "./types";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const settings: UserSettings = {
  goal: "Improve VO2 max toward 50 while keeping easy running consistent.",
  age: 20,
  heightCm: 179,
  weightKg: 70.8,
  hrMax: 200,
  preferredEasyHrRange: "130-140 bpm",
  weeklyRunFrequency: 5,
  longRunLimitMinutes: 60,
  preferredWorkoutDays: ["Tuesday", "Thursday", "Friday", "Sunday"],
  unavailableDays: ["Saturday"],
  restingHeartRateBaseline: 52,
  hrvBaseline: 64,
  respiratoryRateBaseline: 14.4,
  hrZones: getDefaultHrZones(20),
};

function workout(id: number, date: string, title: string, durationMinutes: number, distanceKm: number, avgHeartRate: number, zones: ZoneMinutes, notes: string): Workout {
  return {
    id: `mock-workout-${id}`,
    userId: "demo-user",
    date,
    type: title.includes("Walk") ? "walk" : title.includes("Mobility") ? "mobility" : "run",
    title,
    durationMinutes,
    distanceKm,
    avgPace: distanceKm > 0 ? `${Math.floor(durationMinutes / distanceKm)}:${String(Math.round(((durationMinutes / distanceKm) % 1) * 60)).padStart(2, "0")}/km` : undefined,
    avgHeartRate,
    maxHeartRate: avgHeartRate + (title.includes("Intervals") ? 42 : 18),
    zones,
    load: calculateWorkoutLoad(zones),
    source: "mock",
    notes,
  };
}

const workoutPlanByOffset: Record<number, [string, number, number, number, ZoneMinutes, string]> = {
  "-34": ["Easy Run", 34, 4.0, 136, { z1: 5, z2: 25, z3: 4, z4: 0, z5: 0 }, "Good aerobic base session."],
  "-32": ["Recovery Run", 25, 2.9, 124, { z1: 10, z2: 14, z3: 1, z4: 0, z5: 0 }, "Kept effort very light."],
  "-30": ["Easy Run", 36, 4.2, 138, { z1: 5, z2: 27, z3: 4, z4: 0, z5: 0 }, "Mostly Zone 2."],
  "-28": ["Long Easy Run", 50, 5.8, 140, { z1: 6, z2: 36, z3: 7, z4: 1, z5: 0 }, "Comfortable long aerobic run."],
  "-27": ["Easy Walk", 28, 2.4, 105, { z1: 28, z2: 0, z3: 0, z4: 0, z5: 0 }, "Low fatigue movement."],
  "-25": ["Easy Run", 33, 3.8, 134, { z1: 5, z2: 25, z3: 3, z4: 0, z5: 0 }, "Relaxed Zone 2 run."],
  "-23": ["Intervals", 42, 4.7, 151, { z1: 8, z2: 12, z3: 8, z4: 10, z5: 4 }, "Controlled VO2 max stimulus."],
  "-21": ["Easy Run", 35, 4.1, 137, { z1: 5, z2: 27, z3: 3, z4: 0, z5: 0 }, "Easy aerobic follow-up."],
  "-20": ["Long Easy Run", 53, 6.1, 141, { z1: 6, z2: 39, z3: 7, z4: 1, z5: 0 }, "Longest run stayed easy."],
  "-18": ["Recovery Run", 26, 3.0, 126, { z1: 9, z2: 16, z3: 1, z4: 0, z5: 0 }, "Light recovery volume."],
  "-16": ["Easy Run", 35, 4.1, 136, { z1: 4, z2: 28, z3: 3, z4: 0, z5: 0 }, "Consistent Zone 2."],
  "-14": ["Easy Run", 38, 4.4, 139, { z1: 5, z2: 29, z3: 4, z4: 0, z5: 0 }, "Slightly longer base run."],
  "-13": ["Long Easy Run", 55, 6.3, 142, { z1: 6, z2: 39, z3: 8, z4: 2, z5: 0 }, "Good endurance session."],
  "-11": ["Easy Run", 34, 4.0, 135, { z1: 5, z2: 26, z3: 3, z4: 0, z5: 0 }, "Easy pace discipline."],
  "-9": ["Intervals", 40, 4.6, 153, { z1: 7, z2: 12, z3: 9, z4: 9, z5: 3 }, "Quality session, not all-out."],
  "-7": ["Recovery Run", 24, 2.8, 123, { z1: 10, z2: 13, z3: 1, z4: 0, z5: 0 }, "Recovery stayed controlled."],
  "-6": ["Easy Run", 36, 4.2, 137, { z1: 5, z2: 28, z3: 3, z4: 0, z5: 0 }, "Steady aerobic work."],
  "-4": ["Easy Run", 35, 4.1, 138, { z1: 5, z2: 27, z3: 3, z4: 0, z5: 0 }, "Mostly Zone 2."],
  "-2": ["Long Easy Run", 54, 6.2, 142, { z1: 6, z2: 38, z3: 8, z4: 2, z5: 0 }, "Long run increased carefully."],
  "-1": ["Mobility", 18, 0, 101, { z1: 18, z2: 0, z3: 0, z4: 0, z5: 0 }, "Light mobility only."],
};

export const mockWorkouts: Workout[] = Object.entries(workoutPlanByOffset).map(([offset, data], index) =>
  workout(index + 1, addDays(MOCK_TODAY, Number(offset)), data[0], data[1], data[2], data[3], data[4], data[5]),
);

export const mockSleepRecords: SleepRecord[] = Array.from({ length: 35 }, (_, index) => {
  const offset = index - 34;
  const date = addDays(MOCK_TODAY, offset);
  const wave = Math.sin(index / 3) * 6;
  const low = offset === -9 || offset === -1;
  const score = Math.round(low ? 61 + wave : 77 + wave);
  const durationMinutes = Math.round((low ? 390 : 455) + wave * 4);

  return {
    date,
    score,
    durationMinutes,
    interruptions: low ? 4 : index % 5 === 0 ? 2 : 1,
    respiratoryRate: Math.round((14.3 + Math.sin(index / 4) * 0.4) * 10) / 10,
  };
});

export const mockRecoveryRecords: RecoveryRecord[] = mockSleepRecords.map((sleep, index) => {
  const afterHard = sleep.date === addDays(MOCK_TODAY, -8) || sleep.date === addDays(MOCK_TODAY, -1);
  const restingHeartRate = afterHard ? 58 : 51 + (index % 4);
  const hrv = afterHard ? 51 : 61 + (index % 7);
  const score = Math.round(sleep.score * 0.55 + (100 - Math.max(0, restingHeartRate - settings.restingHeartRateBaseline!) * 7) * 0.25 + (hrv / settings.hrvBaseline!) * 20);

  return {
    date: sleep.date,
    score: Math.min(95, Math.max(42, score)),
    restingHeartRate,
    hrv,
    respiratoryRate: sleep.respiratoryRate,
    note: afterHard ? "Slight fatigue after harder load." : "Normal overnight recovery.",
  };
});

export const mockBodyMetrics: BodyMetric[] = Array.from({ length: 29 }, (_, index) => {
  const date = addDays(MOCK_TODAY, index - 28);
  const weightKg = Math.round((71.4 - index * 0.022 + Math.sin(index / 2) * 0.12) * 10) / 10;

  return {
    date,
    weightKg,
    heightCm: settings.heightCm!,
    waistCm: Math.round((78.5 - index * 0.018) * 10) / 10,
    chestCm: 94.5,
    hipsCm: 92.2,
    thighCm: 55.8,
    armCm: 30.4,
  };
});

export const mockVo2Max: Vo2MaxPoint[] = [
  { date: addDays(MOCK_TODAY, -42), value: 42.4 },
  { date: addDays(MOCK_TODAY, -35), value: 42.6 },
  { date: addDays(MOCK_TODAY, -28), value: 42.7 },
  { date: addDays(MOCK_TODAY, -21), value: 43.0 },
  { date: addDays(MOCK_TODAY, -14), value: 43.1 },
  { date: addDays(MOCK_TODAY, -7), value: 43.2 },
  { date: MOCK_TODAY, value: 43.3 },
];

export const mockSnapshot: HealthDataSnapshot = {
  source: "mock",
  timezone: DEFAULT_TIMEZONE,
  workouts: mockWorkouts,
  sleep: mockSleepRecords,
  recovery: mockRecoveryRecords,
  body: mockBodyMetrics,
  vo2Max: mockVo2Max,
  settings,
};

export class MockHealthDataSource implements HealthDataSource {
  name = "mock" as const;

  async getSnapshot(): Promise<HealthDataSnapshot> {
    return mockSnapshot;
  }
}

export async function getMockHealthSnapshot(): Promise<HealthDataSnapshot> {
  return new MockHealthDataSource().getSnapshot();
}
