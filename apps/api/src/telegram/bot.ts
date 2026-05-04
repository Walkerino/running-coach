import { Bot } from "grammy";

import { env } from "../config/env.js";
import { calculateReadiness } from "../training/readiness-service.js";
import { runAgent } from "../agent/agent-service.js";
import { saveConversationMessage } from "../services/conversation-service.js";
import {
  deleteUserData,
  ensureUserFromTelegram,
  getUserByTelegramId,
  updateUserProfile,
} from "../services/user-service.js";
import { buildUserSummary } from "../services/summary-service.js";

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

bot.catch(async (error) => {
  console.error("Telegram bot error", error.error);

  const chatId = error.ctx.chat?.id;
  if (chatId) {
    try {
      await error.ctx.api.sendMessage(
        chatId,
        "I hit an internal error while processing that message. Please try again.",
      );
    } catch {
      // Best effort only; avoid cascading failures from the error handler.
    }
  }
});

function requireFrom(ctx: { from?: { id: number; username?: string; first_name?: string } }) {
  if (!ctx.from) {
    throw new Error("Telegram sender is missing");
  }

  return ctx.from;
}

function profileToText(user: Awaited<ReturnType<typeof getUserByTelegramId>>) {
  if (!user) {
    return "Profile not found.";
  }

  return [
    `Name: ${user.firstName ?? "-"}`,
    `Age: ${user.age ?? "-"}`,
    `Sex: ${user.sex ?? "-"}`,
    `Height: ${user.heightCm ?? "-"} cm`,
    `Weight: ${user.weightKg ?? "-"} kg`,
    `Goal: ${user.goal ?? "-"}`,
    `Easy HR: ${user.usualEasyHrMin ?? "-"}-${user.usualEasyHrMax ?? "-"} bpm`,
    `Frequency: ${user.runningFrequencyPerWeek ?? "-"} runs/week`,
    `Preferred run time: ${user.preferredRunTime ?? "-"}`,
    `Morning readiness: ${user.morningReadinessEnabled ? `on at ${user.morningReadinessTime}` : "off"}`,
    `Health token: ${user.healthExportToken}`,
  ].join("\n");
}

function formatTelegramPlainText(text: string) {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}[-*]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

bot.command("start", async (ctx) => {
  const from = requireFrom(ctx);
  const user = await ensureUserFromTelegram({
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name,
  });

  await ctx.reply(
    [
      `Hi ${user.firstName ?? "runner"}. This is your AI running assistant inside Telegram.`,
      "Connect Apple Health via Health Auto Export using your personal health export token from /profile.",
      "You can then ask natural questions like: Should I run today?",
    ].join("\n\n"),
  );
});

bot.command("profile", async (ctx) => {
  const from = requireFrom(ctx);
  const user = await getUserByTelegramId(String(from.id));
  await ctx.reply(profileToText(user));
});

bot.command("set_goal", async (ctx) => {
  const from = requireFrom(ctx);
  const text = ctx.message?.text ?? "";
  const goal = text.replace("/set_goal", "").trim();
  const user = await ensureUserFromTelegram({
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name,
  });

  if (!goal) {
    await ctx.reply("Usage: /set_goal Improve VO2max to 50");
    return;
  }

  await updateUserProfile(user.id, { goal });
  await ctx.reply(`Goal updated: ${goal}`);
});

bot.command("morning_on", async (ctx) => {
  const from = requireFrom(ctx);
  const user = await ensureUserFromTelegram({
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name,
  });

  await updateUserProfile(user.id, {
    morningReadinessEnabled: true,
    morningReadinessTime: "07:45",
  });
  await ctx.reply("Morning readiness is enabled. I will send it daily at 07:45 Europe/Helsinki.");
});

bot.command("morning_off", async (ctx) => {
  const from = requireFrom(ctx);
  const user = await ensureUserFromTelegram({
    telegramId: String(from.id),
    username: from.username,
    firstName: from.first_name,
  });

  await updateUserProfile(user.id, {
    morningReadinessEnabled: false,
  });
  await ctx.reply("Morning readiness is disabled.");
});

bot.command("morning_status", async (ctx) => {
  const from = requireFrom(ctx);
  const user = await getUserByTelegramId(String(from.id));
  if (!user) {
    await ctx.reply("Profile not found.");
    return;
  }

  await ctx.reply(
    user.morningReadinessEnabled
      ? `Morning readiness is on at ${user.morningReadinessTime} (${user.timezone}).`
      : "Morning readiness is off.",
  );
});

bot.command("privacy", async (ctx) => {
  await ctx.reply(
    [
      "Stored data: Telegram profile, running profile, Apple Health workout and recovery summaries from Health Auto Export, readiness scores, and optional conversation context.",
      "Raw health payloads are stored for traceability but are not logged in production and are not sent directly to the AI model.",
      "Use /forget_me to delete your data.",
    ].join("\n\n"),
  );
});

bot.command("forget_me", async (ctx) => {
  const from = requireFrom(ctx);
  const text = ctx.message?.text ?? "";
  if (!text.includes("CONFIRM")) {
    await ctx.reply("To delete your data, send: /forget_me CONFIRM");
    return;
  }

  const user = await getUserByTelegramId(String(from.id));
  if (!user) {
    await ctx.reply("No account found.");
    return;
  }

  await deleteUserData(user.id);
  await ctx.reply("Your personal data has been deleted.");
});

bot.command("export_my_data", async (ctx) => {
  const from = requireFrom(ctx);
  const user = await getUserByTelegramId(String(from.id));
  if (!user) {
    await ctx.reply("No account found.");
    return;
  }

  const summary = await buildUserSummary(user.id);
  await ctx.reply(`Your data summary:\n${JSON.stringify(summary, null, 2).slice(0, 3500)}`);
});

bot.command("sync", async (ctx) => {
  const from = requireFrom(ctx);
  const user = await getUserByTelegramId(String(from.id));
  if (!user) {
    await ctx.reply("Profile not found.");
    return;
  }

  await calculateReadiness(user.id);
  await ctx.reply("Apple Health data is ingested through Health Auto Export. Readiness recalculated.");
});

bot.on("message:text", async (ctx) => {
  const from = requireFrom(ctx);
  const typing = setInterval(() => {
    void ctx.api.sendChatAction(ctx.chat.id, "typing").catch(() => undefined);
  }, 4000);

  try {
    await ctx.api.sendChatAction(ctx.chat.id, "typing");
    const answer = await handleNaturalLanguageMessage({
      telegramId: String(from.id),
      username: from.username,
      firstName: from.first_name,
      text: ctx.message.text,
    });

    await ctx.reply(answer);
  } finally {
    clearInterval(typing);
  }
});
export async function handleNaturalLanguageMessage(input: {
  telegramId: string;
  username?: string;
  firstName?: string;
  text: string;
}) {
  const user = await ensureUserFromTelegram({
    telegramId: input.telegramId,
    username: input.username,
    firstName: input.firstName,
  });

  await saveConversationMessage({
    userId: user.id,
    role: "user",
    content: input.text,
  });

  const answer = await runAgent({
    telegramUserId: input.telegramId,
    message: input.text,
  });
  const formattedAnswer = formatTelegramPlainText(answer);

  await saveConversationMessage({
    userId: user.id,
    role: "assistant",
    content: formattedAnswer,
  });

  return formattedAnswer;
}
