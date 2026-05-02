import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureUserFromTelegram = vi.fn();
const saveConversationMessage = vi.fn();
const runAgent = vi.fn();

vi.mock("../src/services/user-service.js", () => ({
  ensureUserFromTelegram,
}));
vi.mock("../src/services/conversation-service.js", () => ({
  saveConversationMessage,
}));
vi.mock("../src/agent/agent-service.js", () => ({
  runAgent,
}));

describe("handleNaturalLanguageMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves conversation state and returns agent output", async () => {
    ensureUserFromTelegram.mockResolvedValue({ id: "user-1" });
    runAgent.mockResolvedValue("Сегодня: лёгкий бег, не интервалы.");

    const { handleNaturalLanguageMessage } = await import("../src/telegram/bot.js");
    const answer = await handleNaturalLanguageMessage({
      telegramId: "42",
      username: "runner",
      firstName: "Ivan",
      text: "Стоит ли мне сегодня бежать?",
    });

    expect(answer).toContain("лёгкий");
    expect(saveConversationMessage).toHaveBeenCalledTimes(2);
    expect(runAgent).toHaveBeenCalledWith({
      telegramUserId: "42",
      message: "Стоит ли мне сегодня бежать?",
    });
  });

  it("removes markdown artifacts from agent output", async () => {
    ensureUserFromTelegram.mockResolvedValue({ id: "user-1" });
    runAgent.mockResolvedValue("**План**\n\n* **Сегодня:** лёгкий бег\n* Отдых после");

    const { handleNaturalLanguageMessage } = await import("../src/telegram/bot.js");
    const answer = await handleNaturalLanguageMessage({
      telegramId: "42",
      text: "План?",
    });

    expect(answer).toBe("План\n- Сегодня: лёгкий бег\n- Отдых после");
    expect(saveConversationMessage).toHaveBeenLastCalledWith({
      userId: "user-1",
      role: "assistant",
      content: "План\n- Сегодня: лёгкий бег\n- Отдых после",
    });
  });
});
