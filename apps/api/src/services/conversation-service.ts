import { prisma } from "../db/prisma.js";

export async function saveConversationMessage(input: {
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadataJson?: unknown;
}) {
  return prisma.conversationMessage.create({
    data: {
      ...input,
      metadataJson: input.metadataJson as never,
    },
  });
}

export async function getRecentConversation(userId: string, limit = 10) {
  const messages = await prisma.conversationMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.reverse();
}
