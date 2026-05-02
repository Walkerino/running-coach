import { beforeEach, describe, expect, it, vi } from "vitest";

describe("chatWithOpenRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a non-streaming chat completion request to OpenRouter", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "  Готово.  " } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { chatWithOpenRouter } = await import("../src/llm/openrouter-client.js");
    const result = await chatWithOpenRouter([{ role: "user", content: "Привет" }]);

    expect(result).toBe("Готово.");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.test/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-openrouter-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite-preview-09-2025",
          messages: [{ role: "user", content: "Привет" }],
          max_tokens: 450,
          temperature: 0.2,
          stream: false,
        }),
      }),
    );
  });

  it("returns an actionable error when OpenRouter is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")));

    const { chatWithOpenRouter } = await import("../src/llm/openrouter-client.js");

    await expect(chatWithOpenRouter([{ role: "user", content: "Привет" }])).rejects.toThrow(
      "Ensure OPENROUTER_API_KEY is set and the model is available for the account",
    );
  });
});
