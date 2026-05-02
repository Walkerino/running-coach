import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  user: { findUnique: vi.fn() },
  healthDaily: { findMany: vi.fn() },
  healthWorkout: { findMany: vi.fn() },
  subjectiveFeedback: { findFirst: vi.fn() },
  readinessScore: { upsert: vi.fn() },
};

vi.mock("../src/db/prisma.js", () => ({ prisma: prismaMock }));

describe("calculateReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns conservative output when recovery markers are poor", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      usualEasyHrMin: 130,
      usualEasyHrMax: 140,
    });
    prismaMock.healthDaily.findMany
      .mockResolvedValueOnce([
        { date: new Date("2026-04-25"), sleepMinutes: 300, restingHeartRate: 60, hrvMs: 40 },
      ])
      .mockResolvedValueOnce([
        { date: new Date("2026-04-24"), sleepMinutes: 450, restingHeartRate: 51, hrvMs: 68 },
        { date: new Date("2026-04-23"), sleepMinutes: 440, restingHeartRate: 52, hrvMs: 70 },
      ]);
    prismaMock.healthWorkout.findMany.mockResolvedValue([
      {
        date: new Date("2026-04-24T08:00:00Z"),
        distanceMeters: 7000,
        averageHeartRate: 155,
        durationSeconds: 2200,
        workoutType: "Running",
      },
    ]);
    prismaMock.subjectiveFeedback.findFirst.mockResolvedValue({
      energy: 2,
      symptoms: "",
    });

    const { calculateReadiness } = await import("../src/training/readiness-service.js");
    const result = await calculateReadiness("user-1", new Date("2026-04-25"));

    expect(result.status).toBe("low");
    expect(result.recommendationType).toMatch(/rest|recovery/);
    expect(result.reasons.join(" ")).toContain("Sleep");
  });
});
