import { GuildSettings } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Stellt sicher, dass für eine Guild ein GuildSettings-Datensatz existiert,
 * und gibt ihn zurück. Alle anderen Tabellen hängen über die guildId an
 * GuildSettings, daher rufen entsprechende Funktionen (z.B.
 * upsertManagedMessage) dies intern automatisch auf.
 */
export async function ensureGuildSettings(guildId: string): Promise<GuildSettings> {
  return prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

export async function getGuildSettings(guildId: string): Promise<GuildSettings | null> {
  return prisma.guildSettings.findUnique({ where: { guildId } });
}
