import { prisma } from "../database/prisma";
import { ensureGuildSettings } from "../database/guildSettings";
import { logger } from "./logger";

/**
 * Schreibt einen Eintrag in die LogEntry-Tabelle. Dies ist NICHT das
 * vollständige Logger-Modul (Modul 4) – das kommt später mit eigenen
 * Discord-Event-Listenern (messageDelete, guildMemberAdd, ...) und
 * Log-Embeds in Kanälen. Diese Funktion ist lediglich die Grundlage, damit
 * spätere Module Events strukturiert speichern können, ohne die Datenbank-
 * Schicht neu zu erfinden.
 */
export async function recordEvent(params: {
  guildId: string;
  category: string;
  executorId?: string;
  targetId?: string;
  channelId?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    await ensureGuildSettings(params.guildId);

    await prisma.logEntry.create({
      data: {
        guildId: params.guildId,
        category: params.category,
        executorId: params.executorId,
        targetId: params.targetId,
        channelId: params.channelId,
        data: params.data as any,
      },
    });
  } catch (error) {
    // Logging darf niemals den Bot zum Absturz bringen.
    logger.error("EventLog", `Konnte Event "${params.category}" nicht speichern`, error);
  }
}
