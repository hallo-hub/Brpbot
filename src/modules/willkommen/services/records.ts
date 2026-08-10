import { prisma } from "../../../database/prisma";
import { ensureGuildSettings } from "../../../database/guildSettings";

export async function recordJoin(guildId: string, userId: string): Promise<void> {
  await ensureGuildSettings(guildId);

  await prisma.welcomeRecord.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId, joinedAt: new Date() },
    update: { joinedAt: new Date() },
  });
}

export async function recordLeave(guildId: string, userId: string): Promise<void> {
  await ensureGuildSettings(guildId);

  await prisma.welcomeRecord.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId, leftAt: new Date() },
    update: { leftAt: new Date() },
  });
}

export async function recordFeedback(guildId: string, userId: string, feedback: string): Promise<void> {
  await ensureGuildSettings(guildId);

  await prisma.welcomeRecord.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId, feedback, feedbackAt: new Date() },
    update: { feedback, feedbackAt: new Date() },
  });
}
