import { WelcomeSettings } from "@prisma/client";
import { prisma } from "../../../database/prisma";
import { ensureGuildSettings } from "../../../database/guildSettings";

/** Holt die Einstellungen einer Guild oder erstellt sie mit Standardwerten. */
export async function getOrCreateWelcomeSettings(guildId: string): Promise<WelcomeSettings> {
  await ensureGuildSettings(guildId);

  return prisma.welcomeSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

export async function updateWelcomeSettings(
  guildId: string,
  data: Partial<
    Pick<
      WelcomeSettings,
      | "welcomeChannelId"
      | "leaveChannelId"
      | "feedbackChannelId"
      | "joinDmEnabled"
      | "leaveDmEnabled"
      | "welcomeText"
      | "welcomeDmText"
      | "leaveText"
      | "leaveDmText"
      | "embedColor"
      | "imageUrl"
      | "thumbnailUrl"
    >
  >
): Promise<WelcomeSettings> {
  await ensureGuildSettings(guildId);

  return prisma.welcomeSettings.upsert({
    where: { guildId },
    create: { guildId, ...data },
    update: data,
  });
}
