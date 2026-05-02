import type { Prisma, User } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { createOpaqueToken } from "../utils/id.js";

const DEFAULT_PROFILE = {
  age: 20,
  sex: "male",
  heightCm: 185,
  weightKg: 70,
  goal: "improve VO2max to around 50",
  usualEasyHrMin: 130,
  usualEasyHrMax: 140,
  runningFrequencyPerWeek: 5,
  preferredRunTime: "morning",
  timezone: "Europe/Helsinki",
};

export async function ensureUserFromTelegram(input: {
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
}): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { telegramId: input.telegramId },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        username: input.username ?? existing.username,
        firstName: input.firstName ?? existing.firstName,
      },
    });
  }

  return prisma.user.create({
    data: {
      telegramId: input.telegramId,
      username: input.username ?? undefined,
      firstName: input.firstName ?? undefined,
      healthExportToken: createOpaqueToken(),
      ...DEFAULT_PROFILE,
    },
  });
}

export async function getUserByTelegramId(telegramId: string) {
  return prisma.user.findUnique({
    where: { telegramId },
    include: { stravaConnection: true },
  });
}

export async function updateUserProfile(userId: string, patch: Prisma.UserUpdateInput) {
  return prisma.user.update({
    where: { id: userId },
    data: patch,
  });
}

export async function deleteUserData(userId: string) {
  await prisma.user.delete({
    where: { id: userId },
  });
}
