import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  healthPayloadImport: { create: vi.fn() },
  healthMetricSample: { upsert: vi.fn() },
  healthDaily: { upsert: vi.fn(), findMany: vi.fn() },
  healthWorkout: { upsert: vi.fn(), findMany: vi.fn() },
};

vi.mock("../src/db/prisma.js", () => ({ prisma: prismaMock }));

describe("health service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates workouts by stable source id", async () => {
    const { ingestHealthPayload } = await import("../src/health/health-service.js");

    await ingestHealthPayload({
      userId: "user-1",
      payload: {
        data: {
          workouts: [
            {
              id: "workout-1",
              name: "Running",
              start: "2026-05-04 07:00:00 +0300",
              duration: 1800,
              distance: { qty: 5, units: "km" },
            },
          ],
        },
      },
    });

    expect(prismaMock.healthWorkout.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.healthWorkout.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fingerprint: expect.any(String) },
        create: expect.objectContaining({
          userId: "user-1",
          fingerprint: expect.any(String),
          workoutType: "Running",
        }),
      }),
    );
  });

  it("formats health summary dates in app timezone without UTC shift", async () => {
    prismaMock.healthDaily.findMany.mockResolvedValue([
      {
        date: new Date("2026-05-03T21:00:00.000Z"),
        sleepMinutes: 430,
        restingHeartRate: 50,
        hrvMs: 70,
        vo2max: 52,
        steps: 10000,
      },
    ]);
    prismaMock.healthWorkout.findMany.mockResolvedValue([
      {
        date: new Date("2026-05-03T22:30:00.000Z"),
        workoutType: "Running",
        durationSeconds: 1800,
        distanceMeters: 5000,
        averageHeartRate: 145,
      },
    ]);

    const { getHealthSummary } = await import("../src/health/health-service.js");
    const summary = await getHealthSummary("user-1", 14);

    expect(summary.daily[0]?.date).toBe("2026-05-04");
    expect(summary.workouts[0]?.date).toBe("2026-05-04");
    expect(summary.workouts[0]?.startedAt).toBe("2026-05-04T01:30:00+03:00");
  });
});
