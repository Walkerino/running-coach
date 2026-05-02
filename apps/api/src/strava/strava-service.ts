  import { prisma } from "../db/prisma.js";
import { decrypt, encrypt } from "../security/crypto.js";
import { createOpaqueToken } from "../utils/id.js";

type StravaTokenResponse = {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: { id: number };
};

type StravaActivityPayload = Record<string, unknown> & {
  id: number;
  name?: string;
  sport_type?: string;
  type?: string;
  start_date?: string;
  timezone?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  average_speed?: number;
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
  suffer_score?: number;
  perceived_exertion?: number;
  calories?: number;
  visibility?: string;
  private?: boolean;
};

export type StravaClientConfig = {
  clientId: string;
  clientSecret: string;
  publicBaseUrl: string;
};

export function createStravaAuthState(telegramId: string) {
  return `${telegramId}.${createOpaqueToken(12)}`;
}

export function buildStravaAuthUrl(config: StravaClientConfig, telegramId: string, state: string) {
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "force");
  url.searchParams.set("redirect_uri", `${config.publicBaseUrl}/auth/strava/callback`);
  url.searchParams.set("scope", "read,activity:read,activity:read_all");
  url.searchParams.set("state", state);
  url.searchParams.set("telegramId", telegramId);
  return url.toString();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ data: T; headers: Headers }> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Strava request failed with status ${response.status}`);
  }

  return {
    data: (await response.json()) as T,
    headers: response.headers,
  };
}

export async function exchangeStravaCode(input: {
  code: string;
  config: StravaClientConfig;
}) {
  const { data } = await fetchJson<StravaTokenResponse>("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: input.config.clientId,
      client_secret: input.config.clientSecret,
      code: input.code,
      grant_type: "authorization_code",
    }),
  });

  return data;
}

export async function storeStravaConnection(input: {
  userId: string;
  token: StravaTokenResponse;
  scope?: string | null;
}) {
  return prisma.stravaConnection.upsert({
    where: { userId: input.userId },
    update: {
      athleteId: String(input.token.athlete.id),
      accessTokenEncrypted: encrypt(input.token.access_token),
      refreshTokenEncrypted: encrypt(input.token.refresh_token),
      expiresAt: new Date(input.token.expires_at * 1000),
      scope: input.scope ?? undefined,
    },
    create: {
      userId: input.userId,
      athleteId: String(input.token.athlete.id),
      accessTokenEncrypted: encrypt(input.token.access_token),
      refreshTokenEncrypted: encrypt(input.token.refresh_token),
      expiresAt: new Date(input.token.expires_at * 1000),
      scope: input.scope ?? undefined,
    },
  });
}

export async function ensureValidStravaAccessToken(input: {
  userId: string;
  config: StravaClientConfig;
}) {
  const connection = await prisma.stravaConnection.findUnique({
    where: { userId: input.userId },
  });

  if (!connection) {
    throw new Error("Strava is not connected");
  }

  if (connection.expiresAt.getTime() > Date.now() + 60_000) {
    return decrypt(connection.accessTokenEncrypted);
  }

  const { data } = await fetchJson<StravaTokenResponse>("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: input.config.clientId,
      client_secret: input.config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: decrypt(connection.refreshTokenEncrypted),
    }),
  });

  await storeStravaConnection({
    userId: input.userId,
    token: data,
    scope: connection.scope,
  });

  return data.access_token;
}

export async function syncStravaActivities(input: {
  userId: string;
  config: StravaClientConfig;
  days?: number;
}) {
  const accessToken = await ensureValidStravaAccessToken(input);
  const after = Math.floor((Date.now() - (input.days ?? 90) * 24 * 60 * 60 * 1000) / 1000);

  const { data, headers } = await fetchJson<StravaActivityPayload[]>(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const rateLimitLimit = headers.get("x-ratelimit-limit");
  const rateLimitUsage = headers.get("x-ratelimit-usage");

  for (const activity of data) {
    await prisma.stravaActivity.upsert({
      where: { stravaActivityId: String(activity.id) },
      update: {
        name: activity.name ?? null,
        sportType: activity.sport_type ?? null,
        type: activity.type ?? null,
        startDate: new Date(activity.start_date ?? new Date().toISOString()),
        timezone: activity.timezone ?? null,
        distanceMeters: activity.distance ?? null,
        movingTimeSeconds: activity.moving_time ?? null,
        elapsedTimeSeconds: activity.elapsed_time ?? null,
        averageSpeed: activity.average_speed ?? null,
        maxSpeed: activity.max_speed ?? null,
        averageHeartrate: activity.average_heartrate ?? null,
        maxHeartrate: activity.max_heartrate ?? null,
        totalElevationGain: activity.total_elevation_gain ?? null,
        sufferScore: activity.suffer_score ?? null,
        perceivedExertion: activity.perceived_exertion ?? null,
        calories: activity.calories ?? null,
        visibility: activity.visibility ?? (activity.private ? "private" : "everyone"),
        isDeleted: false,
        rawJson: activity as never,
      },
      create: {
        userId: input.userId,
        stravaActivityId: String(activity.id),
        name: activity.name ?? null,
        sportType: activity.sport_type ?? null,
        type: activity.type ?? null,
        startDate: new Date(activity.start_date ?? new Date().toISOString()),
        timezone: activity.timezone ?? null,
        distanceMeters: activity.distance ?? null,
        movingTimeSeconds: activity.moving_time ?? null,
        elapsedTimeSeconds: activity.elapsed_time ?? null,
        averageSpeed: activity.average_speed ?? null,
        maxSpeed: activity.max_speed ?? null,
        averageHeartrate: activity.average_heartrate ?? null,
        maxHeartrate: activity.max_heartrate ?? null,
        totalElevationGain: activity.total_elevation_gain ?? null,
        sufferScore: activity.suffer_score ?? null,
        perceivedExertion: activity.perceived_exertion ?? null,
        calories: activity.calories ?? null,
        visibility: activity.visibility ?? (activity.private ? "private" : "everyone"),
        rawJson: activity as never,
      },
    });
  }

  return {
    count: data.length,
    rateLimitLimit,
    rateLimitUsage,
  };
}

export async function markStravaActivityDeleted(stravaActivityId: string) {
  return prisma.stravaActivity.updateMany({
    where: { stravaActivityId },
    data: { isDeleted: true },
  });
}
