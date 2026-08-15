import { VoiceSupportSettings } from "@prisma/client";
import { prisma } from "../../../database/prisma";
import { ensureGuildSettings } from "../../../database/guildSettings";
import { config } from "../../../config/env";

export async function getOrCreateVoiceSupportSettings(guildId: string): Promise<VoiceSupportSettings> {
  await ensureGuildSettings(guildId);

  return prisma.voiceSupportSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

export async function updateVoiceSupportSettings(
  guildId: string,
  data: Partial<
    Pick<VoiceSupportSettings, "waitingRoomChannelId" | "pingChannelId" | "pingRoleIds" | "claimRoleIds">
  >
): Promise<VoiceSupportSettings> {
  await ensureGuildSettings(guildId);

  return prisma.voiceSupportSettings.upsert({
    where: { guildId },
    create: { guildId, ...data },
    update: data,
  });
}

export function parseIdList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/** Prüft, ob ein GuildMember mindestens eine der angegebenen Rollen besitzt. */
export function memberHasAnyRole(member: { roles: { cache: { has: (id: string) => boolean } } }, roleIds: string[]): boolean {
  return roleIds.some((id) => member.roles.cache.has(id));
}

/** Rollen, die Fälle übernehmen/übergeben/schließen dürfen: konfigurierte claimRoleIds, sonst Fallback auf Team/High-Team/Admin. */
export function resolveClaimRoleIds(settings: VoiceSupportSettings): string[] {
  const configured = parseIdList(settings.claimRoleIds);
  if (configured.length > 0) return configured;
  return [...config.roles.team, ...config.roles.highTeam, ...config.roles.admin];
}
