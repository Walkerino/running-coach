import { NextResponse } from "next/server";
import { apiFetch, isMissingAdminApiKeyError, shouldUseMockHealthData } from "@/lib/health/api-data";
import { getTrainingPlanOverride, saveTrainingPlanOverride } from "@/lib/health/plan-overrides";
import type { TrainingPlanOverride } from "@/lib/health/types";

function getUserQuery() {
  const params = new URLSearchParams();
  if (process.env.WEB_USER_ID) params.set("userId", process.env.WEB_USER_ID);
  if (process.env.WEB_TELEGRAM_ID) params.set("telegramId", process.env.WEB_TELEGRAM_ID);
  return params;
}

function getUserBody() {
  return {
    userId: process.env.WEB_USER_ID || undefined,
    telegramId: process.env.WEB_TELEGRAM_ID || undefined,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const weekStart = url.searchParams.get("weekStart");
  if (!weekStart) {
    return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
  }

  if (shouldUseMockHealthData()) {
    const override = await getTrainingPlanOverride(weekStart);
    return override ? NextResponse.json(override) : NextResponse.json({ error: "Training plan override not found" }, { status: 404 });
  }

  const params = getUserQuery();
  params.set("weekStart", weekStart);

  try {
    const response = await apiFetch(`/web/training-plan-override?${params.toString()}`);
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch (cause) {
    if (isMissingAdminApiKeyError(cause)) {
      return NextResponse.json({ error: "ADMIN_API_KEY is required for training plan overrides." }, { status: 503 });
    }
    throw cause;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as TrainingPlanOverride;

  if (shouldUseMockHealthData()) {
    return NextResponse.json(await saveTrainingPlanOverride(body));
  }

  try {
    const response = await apiFetch("/web/training-plan-override", {
      method: "POST",
      body: JSON.stringify({ ...getUserBody(), ...body }),
    });
    const responseBody = await response.json();
    return NextResponse.json(responseBody, { status: response.status });
  } catch (cause) {
    if (isMissingAdminApiKeyError(cause)) {
      return NextResponse.json({ error: "ADMIN_API_KEY is required for training plan overrides." }, { status: 503 });
    }
    throw cause;
  }
}
