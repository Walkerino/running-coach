import { prisma } from "../db/prisma.js";
import { getHealthSummary } from "../health/health-service.js";
import { chatWithOpenRouter, type LlmMessage } from "../llm/openrouter-client.js";
import { getRecentConversation } from "../services/conversation-service.js";
import { calculateReadiness, getTrainingLoad } from "../training/readiness-service.js";

const systemPrompt = `You are a personal AI running assistant inside Telegram.

You help the user make daily and weekly running decisions using:
- Strava running activities
- Apple Health recovery data from Health Auto Export
- user goals
- recent training load
- subjective feedback

Never invent health or training data.
Use only the deterministic training context when it is provided.
When deterministic training context is provided, it overrides older conversation history.
If needed data is missing, say exactly what is missing and give a conservative fallback.
Do not provide medical diagnosis.
If the user reports chest pain, dizziness, unusual shortness of breath, fainting, sharp pain, or other concerning symptoms, recommend stopping training and seeking medical advice.
For training recommendations, prefer safe progressive overload.
For this user, easy running is usually HR 130–140 bpm.
The user’s goal is to improve VO2max toward 50.
Use intervals at most once per week unless explicitly configured otherwise.
Keep answers concise, practical, and actionable.
Limit answers to 6 short bullet points unless the user explicitly asks for more detail.
Answer in the same language as the user.
Use plain Telegram-friendly text only.
Do not use Markdown markers such as **bold**, __underline__, # headings, or table syntax.
Use short headings on their own line and hyphen bullets when structure is helpful.

Training decisions must follow the deterministic readiness and training load outputs, not free-form model guesses.`;

function isTrainingRequest(message: string) {
  const normalized = message.toLowerCase();
  const keywords = [
    "run",
    "running",
    "train",
    "training",
    "workout",
    "interval",
    "vo2",
    "hr",
    "heart rate",
    "health",
    "apple health",
    "health auto export",
    "sleep",
    "hrv",
    "resting heart",
    "readiness",
    "recovery",
    "бег",
    "бежать",
    "пробеж",
    "трен",
    "тренировка",
    "интервал",
    "пульс",
    "здоров",
    "сон",
    "сна",
    "спал",
    "hrv",
    "чсс покоя",
    "вариабель",
    "восстанов",
    "готовность",
    "нагруз",
  ];

  return keywords.some((keyword) => normalized.includes(keyword));
}

async function getRecentRuns(userId: string) {
  const from = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  const runs = await prisma.stravaActivity.findMany({
    where: {
      userId,
      isDeleted: false,
      startDate: { gte: from },
    },
    orderBy: { startDate: "desc" },
    take: 20,
    select: {
      startDate: true,
      name: true,
      sportType: true,
      distanceMeters: true,
      movingTimeSeconds: true,
      averageHeartrate: true,
      sufferScore: true,
    },
  });

  return runs.map((run) => ({
    date: run.startDate.toISOString(),
    name: run.name,
    sportType: run.sportType,
    distanceMeters: run.distanceMeters,
    movingTimeSeconds: run.movingTimeSeconds,
    averageHeartrate: run.averageHeartrate,
    sufferScore: run.sufferScore,
  }));
}

async function buildTrainingContext(userId: string) {
  const [profile, readiness, trainingLoad, healthSummary, recentRuns] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        timezone: true,
        age: true,
        sex: true,
        heightCm: true,
        weightKg: true,
        goal: true,
        usualEasyHrMin: true,
        usualEasyHrMax: true,
        runningFrequencyPerWeek: true,
        preferredRunTime: true,
      },
    }),
    calculateReadiness(userId),
    getTrainingLoad(userId, 28),
    getHealthSummary(userId, 14),
    getRecentRuns(userId),
  ]);

  return {
    profile,
    readiness,
    trainingLoad,
    healthSummary: {
      daily: healthSummary.daily.slice(0, 7),
      workouts: healthSummary.workouts.slice(0, 8),
    },
    recentRuns: recentRuns.slice(0, 10),
  };
}

export async function runAgent(input: { telegramUserId: string; message: string }) {
  const user = await prisma.user.findUnique({
    where: { telegramId: input.telegramUserId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const history = await getRecentConversation(user.id, 8);
  const messages: LlmMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-4).map((item: (typeof history)[number]): LlmMessage => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.content,
    })),
  ];

  if (isTrainingRequest(input.message)) {
    const trainingContext = await buildTrainingContext(user.id);
    messages.push({
      role: "user",
      content:
        "Deterministic training context for the next user message. " +
        "Use this as the only source for health, running, readiness, and training load facts:\n" +
        JSON.stringify(trainingContext),
    });
  }

  messages.push({ role: "user", content: input.message });

  return chatWithOpenRouter(messages);
}
