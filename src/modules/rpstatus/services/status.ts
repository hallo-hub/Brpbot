import { RpStatus, RpStatusValue } from "@prisma/client";
import { prisma } from "../../../database/prisma";
import { ensureGuildSettings } from "../../../database/guildSettings";

export async function getOrCreateRpStatus(guildId: string): Promise<RpStatus> {
  await ensureGuildSettings(guildId);

  return prisma.rpStatus.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

export async function setRpOpen(guildId: string, userId: string): Promise<RpStatus> {
  await ensureGuildSettings(guildId);

  return prisma.rpStatus.upsert({
    where: { guildId },
    create: { guildId, status: RpStatusValue.OPEN, startedAt: new Date(), startedBy: userId },
    update: { status: RpStatusValue.OPEN, startedAt: new Date(), startedBy: userId, endedAt: null, endedBy: null },
  });
}

export async function setRpClosed(guildId: string, userId: string): Promise<RpStatus> {
  await ensureGuildSettings(guildId);

  return prisma.rpStatus.upsert({
    where: { guildId },
    create: { guildId, status: RpStatusValue.CLOSED, endedAt: new Date(), endedBy: userId },
    update: { status: RpStatusValue.CLOSED, endedAt: new Date(), endedBy: userId },
  });
}
