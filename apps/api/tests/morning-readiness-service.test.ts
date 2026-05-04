import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  user: { findMany: vi.fn(), update: vi.fn() },
  healthDaily: { findUnique: vi.fn() },
  healthWorkout: { findMany: vi.fn() },
  healthMetricSample: { findFirst: vi.fn() },
};
const sendMessage = vi.fn();
const calculateReadiness = vi.fn();

vi.mock("../src/db/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../src/telegram/bot.js", () => ({
  bot: { api: { sendMessage } },
}));
vi.mock("../src/training/readiness-service.js", () => ({ calculateReadiness }));

describe("morning readiness notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects when a notification is due in the user's timezone", async () => {
    const { morningReadinessInternals } = await import("../src/services/morning-readiness-service.js");

    expect(
      morningReadinessInternals.isDueNow({
        timezoneName: "Europe/Helsinki",
        scheduledTime: "07:45",
        lastSentAt: null,
        now: new Date("2026-05-04T04:45:00Z"),
      }),
    ).toBe(true);

    expect(
      morningReadinessInternals.isDueNow({
        timezoneName: "Europe/Helsinki",
        scheduledTime: "07:45",
        lastSentAt: new Date("2026-05-04T04:30:00Z"),
        now: new Date("2026-05-04T04:45:00Z"),
      }),
    ).toBe(false);
  });

  it("sends a morning digest once for due users", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        telegramId: "42",
        timezone: "Europe/Helsinki",
        morningReadinessTime: "07:45",
        lastMorningReadinessSentAt: null,
      },
    ]);
    calculateReadiness.mockResolvedValue({
      score: 78,
      status: "high",
      recommendationType: "easy_run",
      reasons: ["No strong fatigue signals were detected in recent data."],
      warnings: [],
      suggestedSession: {
        title: "Easy aerobic run",
        durationMinutes: 30,
        targetHrMin: 130,
        targetHrMax: 140,
        structure: [],
      },
    });
    prismaMock.healthDaily.findUnique
      .mockResolvedValueOnce({
        sleepMinutes: 450,
        restingHeartRate: 51,
        hrvMs: 68,
      })
      .mockResolvedValueOnce({
        steps: 10234,
        activeEnergyKcal: 610,
      });
    prismaMock.healthWorkout.findMany.mockResolvedValue([
      { distanceMeters: 5400, durationSeconds: 1920, calories: 380 },
    ]);
    prismaMock.healthMetricSample.findFirst.mockResolvedValue({
      avg: 13.4,
      qty: null,
    });

    const { sendDueMorningReadinessNotifications } = await import("../src/services/morning-readiness-service.js");
    await sendDueMorningReadinessNotifications(new Date("2026-05-04T04:45:00Z"));

    expect(sendMessage).toHaveBeenCalledWith(
      "42",
      expect.stringContaining("Morning readiness"),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      "42",
      expect.stringContaining("breathing 13.4 / min"),
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { lastMorningReadinessSentAt: new Date("2026-05-04T04:45:00Z") },
    });
  });
});
