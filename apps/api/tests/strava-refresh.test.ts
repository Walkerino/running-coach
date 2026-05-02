import { beforeEach, describe, expect, it, vi } from "vitest";

import { encrypt } from "../src/security/crypto.js";

const prismaMock = {
  stravaConnection: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock("../src/db/prisma.js", () => ({ prisma: prismaMock }));

describe("ensureValidStravaAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("refreshes expired tokens and stores encrypted replacements", async () => {
    prismaMock.stravaConnection.findUnique.mockResolvedValue({
      userId: "user-1",
      athleteId: "1",
      accessTokenEncrypted: encrypt("old-access"),
      refreshTokenEncrypted: encrypt("old-refresh"),
      expiresAt: new Date(Date.now() - 10_000),
      scope: "read",
    });
    prismaMock.stravaConnection.upsert.mockResolvedValue({});

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        athlete: { id: 1 },
      }),
      headers: new Headers(),
    } as Response);

    const { ensureValidStravaAccessToken } = await import("../src/strava/strava-service.js");
    const token = await ensureValidStravaAccessToken({
      userId: "user-1",
      config: {
        clientId: "client",
        clientSecret: "secret",
        publicBaseUrl: "https://example.com",
      },
    });

    expect(token).toBe("new-access");
    expect(prismaMock.stravaConnection.upsert).toHaveBeenCalled();
  });
});
