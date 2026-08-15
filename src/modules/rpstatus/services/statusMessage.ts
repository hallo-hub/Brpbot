import { Client, TextChannel } from "discord.js";
import { getManagedMessage, upsertManagedMessage } from "../../../database/managedMessages";
import { logger } from "../../../utils/logger";
import { getOrCreateRpStatus } from "./status";
import { getOrCreateRpSettings } from "./settings";
import { buildStatusEmbed } from "./embeds";

const SCOPE = "RpStatus/StatusMessage";

/** Eindeutiger Typ-Schlüssel für das ManagedMessage-System. */
export const RP_STATUS_MESSAGE_TYPE = "rp_status";

/**
 * Aktualisiert das dauerhafte Status-Embed. Existiert bereits eine
 * gespeicherte Nachricht, wird sie bearbeitet – es wird NIEMALS eine neue
 * Nachricht gesendet, solange die alte noch existiert. Nur wenn sie z.B.
 * manuell gelöscht wurde, wird einmalig neu gesendet.
 */
export async function syncStatusMessage(
  client: Client,
  guildId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const settings = await getOrCreateRpSettings(guildId);
  const status = await getOrCreateRpStatus(guildId);

  const targetChannelId = settings.statusChannelId;
  if (!targetChannelId) {
    return {
      ok: false,
      reason: "Es ist noch kein Status-Kanal konfiguriert. Nutze `/rp-status einstellungen`, um einen festzulegen.",
    };
  }

  const channel = await client.channels.fetch(targetChannelId).catch(() => null);
  if (!channel || !(channel instanceof TextChannel)) {
    return { ok: false, reason: `Der konfigurierte Status-Kanal (<#${targetChannelId}>) ist nicht erreichbar.` };
  }

  const embed = buildStatusEmbed(status, settings);
  const existing = await getManagedMessage(guildId, RP_STATUS_MESSAGE_TYPE);

  if (existing) {
    const message = await channel.messages.fetch(existing.messageId).catch(() => null);

    if (message) {
      await message.edit({ embeds: [embed] });
      return { ok: true };
    }

    logger.warn(SCOPE, `Gespeichertes Status-Embed (Message ${existing.messageId}) nicht mehr gefunden, sende neu.`);
  }

  const sent = await channel.send({ embeds: [embed] });
  await upsertManagedMessage({
    guildId,
    channelId: channel.id,
    messageId: sent.id,
    type: RP_STATUS_MESSAGE_TYPE,
  });

  return { ok: true };
}
