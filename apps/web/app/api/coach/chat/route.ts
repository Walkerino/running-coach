import { NextResponse } from "next/server";
import { apiFetch, getHealthSnapshot, isMissingAdminApiKeyError, shouldUseMockHealthData } from "@/lib/health/api-data";
import { getEffectiveToday, getWeekStart } from "@/lib/health/dates";
import { calculateAcuteLoad, calculateChronicLoad, calculateTrainingLoadStatus } from "@/lib/health/load";
import { buildPlanChangeOverride, saveTrainingPlanOverride } from "@/lib/health/plan-overrides";
import { generateWeeklyPlan } from "@/lib/health/plan";
import { calculatePreviousDayLoad, calculateRecoveryScore } from "@/lib/health/recovery";

function localMockMessages() {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  return [
    {
      id: "local-mock-user-yesterday",
      role: "user",
      content: "Can you check my last run?",
      createdAt: yesterday.toISOString(),
    },
    {
      id: "local-mock-assistant-yesterday",
      role: "assistant",
      content: "Local mock: last run was easy aerobic work. Keep the next session relaxed unless recovery improves.",
      createdAt: new Date(yesterday.getTime() + 3 * 60 * 1000).toISOString(),
    },
    {
      id: "local-mock-user-today",
      role: "user",
      content: "What should I run today?",
      createdAt: today.toISOString(),
    },
    {
      id: "local-mock-assistant-today",
      role: "assistant",
      content: "Local mock: choose an easy Zone 2 run for 30-35 min. This is demo text for UI work, not a real training decision.",
      createdAt: new Date(today.getTime() + 2 * 60 * 1000).toISOString(),
    },
  ];
}

function getUserQuery() {
  const params = new URLSearchParams();
  if (process.env.WEB_USER_ID) params.set("userId", process.env.WEB_USER_ID);
  if (process.env.WEB_TELEGRAM_ID) params.set("telegramId", process.env.WEB_TELEGRAM_ID);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function getUserBody() {
  return {
    userId: process.env.WEB_USER_ID || undefined,
    telegramId: process.env.WEB_TELEGRAM_ID || undefined,
  };
}

async function updateWeeklyPlanFromChat(message: string) {
  const data = await getHealthSnapshot();
  const daily = getEffectiveToday(data);
  const acuteLoad = calculateAcuteLoad(data.workouts, daily.today);
  const chronic = calculateChronicLoad(data.workouts, daily.today);
  const loadStatus = calculateTrainingLoadStatus(acuteLoad, chronic.chronicLoad, chronic.hasEnoughBaseline);
  const todaySleep = data.sleep.find((record) => record.date === daily.today) ?? data.sleep.at(-1);
  const todayRecovery = data.recovery.find((record) => record.date === daily.today) ?? data.recovery.at(-1);
  const recovery = calculateRecoveryScore({
    sleep: todaySleep,
    recovery: todayRecovery,
    settings: data.settings,
    previousDayLoad: calculatePreviousDayLoad(data.workouts, daily.today),
    weeklyLoad: acuteLoad,
    chronicLoad: chronic.chronicLoad,
  });
  const weekStart = getWeekStart(daily.today);
  const basePlan = generateWeeklyPlan({
    weekStart,
    loadStatus: loadStatus.status,
    recoveryScore: recovery.score,
    sleepScore: todaySleep?.score ?? recovery.score,
    previousWeekDistanceKm: 18.4,
    settings: data.settings,
    recentWorkouts: data.workouts,
  });
  const result = buildPlanChangeOverride({
    basePlan,
    message,
    weekStart,
    source: shouldUseMockHealthData() ? "local_mock" : "chat",
  });
  if (!result) return null;

  await saveTrainingPlanOverride(result.override);
  return result;
}

export async function GET() {
  if (shouldUseMockHealthData()) {
    return NextResponse.json({ messages: localMockMessages() });
  }

  try {
    const response = await apiFetch(`/web/chat/messages${getUserQuery()}`);
    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json(body, { status: response.status });
    }

    return NextResponse.json(body);
  } catch (cause) {
    if (isMissingAdminApiKeyError(cause)) {
      return NextResponse.json({ error: "ADMIN_API_KEY is required for coach chat backend access." }, { status: 503 });
    }
    throw cause;
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const messageText = String(body.message ?? "");

  if (shouldUseMockHealthData()) {
    const planUpdate = await updateWeeklyPlanFromChat(messageText);
    if (planUpdate) {
      return NextResponse.json({
        answer: `Готово. Я обновил недельный план: ${planUpdate.summary}. Открой Weekly Plan, чтобы увидеть изменения.`,
        message: {
          id: `local-mock-assistant-${Date.now()}`,
          role: "assistant",
          content: `Готово. Я обновил недельный план: ${planUpdate.summary}. Открой Weekly Plan, чтобы увидеть изменения.`,
          createdAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      answer: "Local mock: message received. Backend chat is disabled because ADMIN_API_KEY is not set.",
      message: {
        id: `local-mock-assistant-${Date.now()}`,
        role: "assistant",
        content: `Local mock response to: ${messageText.slice(0, 120)}`,
        createdAt: new Date().toISOString(),
      },
    });
  }

  try {
    const response = await apiFetch("/web/chat", {
      method: "POST",
      body: JSON.stringify({ ...getUserBody(), message: messageText }),
    });
    const responseBody = await response.json();

    if (!response.ok) {
      return NextResponse.json(responseBody, { status: response.status });
    }

    const planUpdate = await updateWeeklyPlanFromChat(messageText);
    if (planUpdate?.override) {
      const suffix = `\n\nPlan updated: ${planUpdate.summary}. Open Weekly Plan to review it.`;
      return NextResponse.json({
        ...responseBody,
        answer: `${responseBody.answer ?? ""}${suffix}`,
        message: responseBody.message
          ? { ...responseBody.message, content: `${responseBody.message.content}${suffix}` }
          : responseBody.message,
      });
    }

    return NextResponse.json(responseBody);
  } catch (cause) {
    if (isMissingAdminApiKeyError(cause)) {
      return NextResponse.json({ error: "ADMIN_API_KEY is required for coach chat backend access." }, { status: 503 });
    }
    throw cause;
  }
}
