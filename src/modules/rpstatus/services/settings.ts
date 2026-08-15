import { RpSettings } from "@prisma/client";
import { prisma } from "../../../database/prisma";
import { ensureGuildSettings } from "../../../database/guildSettings";

export async function getOrCreateRpSettings(guildId: string): Promise<RpSettings> {
  await ensureGuildSettings(guildId);

  return prisma.rpSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

export async function updateRpSettings(
  guildId: string,
  data: Partial<
    Pick<
      RpSettings,
      | "statusChannelId"
      | "announcementChannelId"
      | "servercode"
      | "pingRoleIds"
      | "rpStartText"
      | "rpStopText"
      | "embedColor"
    >
  >
): Promise<RpSettings> {
  await ensureGuildSettings(guildId);

  return prisma.rpSettings.upsert({
    where: { guildId },
    create: { guildId, ...data },
    update: data,
  });
}

/** Wandelt die kommagetrennte Ping-Rollen-Liste in ein Array von Rollen-IDs um. */
export function parsePingRoleIds(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}
