import { mockSnapshot } from "./mock-data";
import type { HealthDataSnapshot, HrZones } from "./types";

const defaultApiBaseUrl = "http://localhost:3000";

function getApiBaseUrl() {
  return process.env.INTERNAL_API_BASE_URL ?? defaultApiBaseUrl;
}

function getUserQuery() {
  const params = new URLSearchParams();
  if (process.env.WEB_USER_ID) params.set("userId", process.env.WEB_USER_ID);
  if (process.env.WEB_TELEGRAM_ID) params.set("telegramId", process.env.WEB_TELEGRAM_ID);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function shouldUseMockHealthData() {
  return process.env.USE_MOCK_HEALTH_DATA === "true";
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is required for web API access");
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-admin-api-key": adminApiKey,
      ...init.headers,
    },
  });
}

export async function getHealthSnapshot(): Promise<HealthDataSnapshot> {
  if (shouldUseMockHealthData()) {
    return mockSnapshot;
  }

  const response = await apiFetch(`/web/health-snapshot${getUserQuery()}`);
  if (!response.ok) {
    throw new Error(`Failed to load health snapshot: ${response.status}`);
  }

  return response.json() as Promise<HealthDataSnapshot>;
}

export async function saveHrZonesToApi(hrZones: HrZones) {
  const response = await apiFetch("/web/settings/hr-zones", {
    method: "PATCH",
    body: JSON.stringify({
      userId: process.env.WEB_USER_ID || undefined,
      telegramId: process.env.WEB_TELEGRAM_ID || undefined,
      hrZones,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save HR zones: ${response.status}`);
  }

  return response.json();
}

export async function setTrainingCompletionToApi(input: {
  date: string;
  workoutType: string;
  title?: string;
  completed: boolean;
}) {
  const response = await apiFetch("/web/training-completions", {
    method: input.completed ? "POST" : "DELETE",
    body: JSON.stringify({
      userId: process.env.WEB_USER_ID || undefined,
      telegramId: process.env.WEB_TELEGRAM_ID || undefined,
      date: input.date,
      workoutType: input.workoutType,
      title: input.title,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update training completion: ${response.status}`);
  }

  return response.json();
}
