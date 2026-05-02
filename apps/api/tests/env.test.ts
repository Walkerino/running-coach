import { describe, expect, it } from "vitest";

describe("env", () => {
  it("uses OpenRouter settings from environment", async () => {
    const { env } = await import("../src/config/env.js");

    expect(env.OPENROUTER_API_KEY).toBe("test-openrouter-key");
    expect(env.OPENROUTER_BASE_URL).toBe("https://openrouter.test/api/v1");
    expect(env.OPENROUTER_MODEL).toBe("google/gemini-2.5-flash-lite-preview-09-2025");
    expect(env.OPENROUTER_REQUEST_TIMEOUT_MS).toBe(120000);
    expect(env.OPENROUTER_MAX_TOKENS).toBe(450);
  });
});
