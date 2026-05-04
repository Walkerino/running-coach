import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  user: { findUnique: vi.fn() },
  healthWorkout: { findMany: vi.fn() },
};
const getRecentConversation = vi.fn();
const getHealthSummary = vi.fn();
const calculateReadiness = vi.fn();
const getTrainingLoad = vi.fn();
const chatWithOpenRouter = vi.fn();

vi.mock("../src/db/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../src/services/conversation-service.js", () => ({ getRecentConversation }));
vi.mock("../src/health/health-service.js", () => ({ getHealthSummary }));
vi.mock("../src/training/readiness-service.js", () => ({ calculateReadiness, getTrainingLoad }));
vi.mock("../src/llm/openrouter-client.js", () => ({ chatWithOpenRouter }));

describe("runAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRecentConversation.mockResolvedValue([]);
    chatWithOpenRouter.mockResolvedValue("Сегодня лучше лёгкий бег.");
  });

  it("adds deterministic summarized context for training requests", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: "user-1", telegramId: "42" })
      .mockResolvedValueOnce({
        timezone: "Europe/Helsinki",
        age: 35,
        sex: null,
        heightCm: null,
        weightKg: null,
        goal: "Improve VO2max",
        usualEasyHrMin: 130,
        usualEasyHrMax: 140,
        runningFrequencyPerWeek: 3,
        preferredRunTime: null,
      });
    calculateReadiness.mockResolvedValue({
      score: 72,
      status: "medium",
      recommendationType: "easy_run",
      reasons: ["Recent hard session."],
      warnings: [],
      suggestedSession: { title: "Easy aerobic run", durationMinutes: 30, structure: ["Run easy"] },
    });
    getTrainingLoad.mockResolvedValue({
      weeklyDistanceKm: 18,
      average4WeekDistanceKm: 16,
      recentHardSessions: 1,
      recentRuns: 4,
    });
    getHealthSummary.mockResolvedValue({
      daily: [{ date: "2026-04-29", sleepMinutes: 430, restingHeartRate: 52, hrvMs: 65, vo2max: 48, steps: 9000 }],
      workouts: [],
    });
    prismaMock.healthWorkout.findMany.mockResolvedValue([
      {
        date: new Date("2026-04-28T07:00:00Z"),
        workoutType: "Running",
        distanceMeters: 5000,
        durationSeconds: 1800,
        averageHeartRate: 136,
        calories: 320,
        rawJson: { shouldNotLeak: true },
      },
    ]);

    const { runAgent } = await import("../src/agent/agent-service.js");
    await runAgent({ telegramUserId: "42", message: "Что делать сегодня по тренировке?" });

    expect(calculateReadiness).toHaveBeenCalledWith("user-1");
    expect(getTrainingLoad).toHaveBeenCalledWith("user-1", 28);
    expect(getHealthSummary).toHaveBeenCalledWith("user-1", 14);
    const messages = chatWithOpenRouter.mock.calls[0][0];
    const contextMessage = messages.find((message: { content: string }) =>
      message.content.includes("Deterministic training context"),
    );
    expect(contextMessage.content).toContain('"readiness"');
    expect(contextMessage.content).toContain('"trainingLoad"');
    expect(contextMessage.content).not.toContain("rawJson");
    expect(contextMessage.content).not.toContain("healthExportToken");
    expect(contextMessage.content).not.toContain("accessTokenEncrypted");
  });

  it("does not load training context for non-training requests", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "user-1", telegramId: "42" });

    const { runAgent } = await import("../src/agent/agent-service.js");
    await runAgent({ telegramUserId: "42", message: "Привет, кто ты?" });

    expect(calculateReadiness).not.toHaveBeenCalled();
    expect(getTrainingLoad).not.toHaveBeenCalled();
    expect(getHealthSummary).not.toHaveBeenCalled();
    expect(prismaMock.healthWorkout.findMany).not.toHaveBeenCalled();
  });

  it("allows broader guidance while keeping health facts deterministic", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: "user-1", telegramId: "42" })
      .mockResolvedValueOnce({
        timezone: "Europe/Helsinki",
        age: 35,
        sex: null,
        heightCm: null,
        weightKg: null,
        goal: "Improve VO2max",
        usualEasyHrMin: 130,
        usualEasyHrMax: 140,
        runningFrequencyPerWeek: 3,
        preferredRunTime: null,
      });
    calculateReadiness.mockResolvedValue({
      score: 72,
      status: "medium",
      recommendationType: "easy_run",
      reasons: ["Recent hard session."],
      warnings: [],
      suggestedSession: { title: "Easy aerobic run", durationMinutes: 30, structure: ["Run easy"] },
    });
    getTrainingLoad.mockResolvedValue({
      weeklyDistanceKm: 18,
      average4WeekDistanceKm: 16,
      recentHardSessions: 1,
      recentRuns: 4,
    });
    getHealthSummary.mockResolvedValue({
      daily: [{ date: "2026-04-29", sleepMinutes: 430, restingHeartRate: 52, hrvMs: 65, vo2max: 48, steps: 9000 }],
      workouts: [],
    });
    prismaMock.healthWorkout.findMany.mockResolvedValue([]);

    const { runAgent } = await import("../src/agent/agent-service.js");
    await runAgent({
      telegramUserId: "42",
      message: "Я устал и не уверен в мотивации, но хочу понять, стоит ли сегодня бежать.",
    });

    const messages = chatWithOpenRouter.mock.calls[0][0];
    expect(messages[0].content).toContain("supplemental personalization context");
    expect(messages[0].content).toContain("You may still answer with general coaching");
    const contextMessage = messages.find((message: { content: string }) =>
      message.content.includes("Deterministic training context"),
    );
    expect(contextMessage.content).toContain("You may still answer broader non-data questions normally");
  });

  it("adds deterministic context for health data questions", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: "user-1", telegramId: "42" })
      .mockResolvedValueOnce({
        timezone: "Europe/Helsinki",
        age: 20,
        sex: "male",
        heightCm: 185,
        weightKg: 70,
        goal: "Improve VO2max",
        usualEasyHrMin: 130,
        usualEasyHrMax: 140,
        runningFrequencyPerWeek: 5,
        preferredRunTime: "morning",
      });
    calculateReadiness.mockResolvedValue({
      score: 70,
      status: "medium",
      recommendationType: "easy_run",
      reasons: [],
      warnings: [],
      suggestedSession: { title: "Easy aerobic run", durationMinutes: 30, structure: ["Run easy"] },
    });
    getTrainingLoad.mockResolvedValue({
      weeklyDistanceKm: 7.1,
      average4WeekDistanceKm: 8.2,
      recentHardSessions: 0,
      recentRuns: 12,
    });
    getHealthSummary.mockResolvedValue({
      daily: [{ date: "2026-04-29", sleepMinutes: 440, restingHeartRate: 51, hrvMs: 70, vo2max: null, steps: 10200 }],
      workouts: [],
    });
    prismaMock.healthWorkout.findMany.mockResolvedValue([]);

    const { runAgent } = await import("../src/agent/agent-service.js");
    await runAgent({ telegramUserId: "42", message: "выпиши мои все данные по здоровью за вчера" });

    expect(calculateReadiness).toHaveBeenCalledWith("user-1");
    expect(getHealthSummary).toHaveBeenCalledWith("user-1", 14);
    const messages = chatWithOpenRouter.mock.calls[0][0];
    const contextMessage = messages.find((message: { content: string }) =>
      message.content.includes("Deterministic training context"),
    );
    expect(contextMessage.content).toContain('"sleepMinutes":440');
    expect(contextMessage.content).toContain('"restingHeartRate":51');
    expect(contextMessage.content).toContain('"hrvMs":70');
  });
});
