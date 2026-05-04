import { describe, expect, it } from "vitest";

import { parseHealthPayload } from "../src/health/parser.js";

describe("parseHealthPayload", () => {
  it("normalizes flexible metric keys", () => {
    const parsed = parseHealthPayload({
      daily: [
        {
          date: "2026-04-25",
          sleep_minutes: 410,
          resting_hr: 52,
          hrv: 71,
          stepCount: 11123,
        },
      ],
      workouts: [
        {
          date: "2026-04-25",
          workoutType: "running",
          durationSeconds: 1800,
          distanceMeters: 5000,
        },
      ],
    });

    expect(parsed.daily[0]?.sleepMinutes).toBe(410);
    expect(parsed.daily[0]?.restingHeartRate).toBe(52);
    expect(parsed.daily[0]?.hrvMs).toBe(71);
    expect(parsed.daily[0]?.steps).toBe(11123);
    expect(parsed.workouts[0]?.distanceMeters).toBe(5000);
  });

  it("normalizes Health Auto Export version 2 metrics and workouts", () => {
    const parsed = parseHealthPayload({
      data: {
        metrics: [
          {
            name: "sleep_analysis",
            units: "hr",
            data: [{ date: "2026-04-29", totalSleep: 7.25 }],
          },
          {
            name: "resting_heart_rate",
            units: "bpm",
            data: [{ date: "2026-04-29 08:00:00 +0300", qty: 51 }],
          },
          {
            name: "heart_rate_variability",
            units: "ms",
            data: [{ date: "2026-04-29 08:00:00 +0300", qty: 68 }],
          },
          {
            name: "heart_rate",
            units: "bpm",
            data: [{ date: "2026-04-29", Min: 48, Avg: 73, Max: 142 }],
          },
          {
            name: "step_count",
            units: "count",
            data: [{ date: "2026-04-29", qty: 9000 }],
          },
          {
            name: "respiratory_rate",
            units: "count/min",
            data: [{ date: "2026-04-29", qty: 15.5 }],
          },
        ],
        workouts: [
          {
            id: "workout-1",
            name: "Running",
            start: "2026-04-29 07:00:00 +0300",
            end: "2026-04-29 07:30:00 +0300",
            duration: 1800,
            distance: { qty: 5, units: "km" },
            activeEnergyBurned: { qty: 320, units: "kcal" },
          },
        ],
      },
    });

    expect(parsed.metricSamples).toHaveLength(6);
    expect(parsed.metricSamples.map((sample) => sample.metricName)).toContain("respiratory_rate");
    expect(parsed.daily[0]?.sleepMinutes).toBe(435);
    expect(parsed.daily[0]?.restingHeartRate).toBe(51);
    expect(parsed.daily[0]?.hrvMs).toBe(68);
    expect(parsed.daily[0]?.averageHeartRate).toBe(73);
    expect(parsed.daily[0]?.minHeartRate).toBe(48);
    expect(parsed.daily[0]?.maxHeartRate).toBe(142);
    expect(parsed.daily[0]?.steps).toBe(9000);
    expect(parsed.workouts[0]?.workoutType).toBe("Running");
    expect(parsed.workouts[0]?.date.toISOString()).toBe("2026-04-29T04:00:00.000Z");
    expect(parsed.workouts[0]?.durationSeconds).toBe(1800);
    expect(parsed.workouts[0]?.distanceMeters).toBe(5000);
    expect(parsed.workouts[0]?.calories).toBe(320);
  });
});
