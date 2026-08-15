import { TeamListSettings } from "@prisma/client";
import { prisma } from "../../../database/prisma";
import { ensureGuildSettings } from "../../../database/guildSettings";

export async function getOrCreateTeamListSettings(guildId: string): Promise<TeamListSettings> {
  await ensureGuildSettings(guildId);

  return prisma.teamListSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

export async function updateTeamListSettings(guildId: string, channelId: string | null): Promise<TeamListSettings> {
  await ensureGuildSettings(guildId);

  return prisma.teamListSettings.upsert({
    where: { guildId },
    create: { guildId, channelId },
    update: { channelId },
  });
}
