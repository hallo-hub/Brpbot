import { Client, TextChannel } from "discord.js";
import { VoiceSupportSession } from "@prisma/client";
import { logger } from "../../../utils/logger";
import { buildSessionEmbed, buildSessionRow } from "./embeds";

const SCOPE = "VoiceSupport/PingMessage";

/** Bearbeitet die Ping-Nachricht eines Falls entsprechend seinem aktuellen Status. */
export async function updateSessionMessage(client: Client, session: VoiceSupportSession): Promise<void> {
  if (!session.pingChannelId || !session.pingMessageId) return;

  const channel = await client.channels.fetch(session.pingChannelId).catch(() => null);
  if (!channel || !(channel instanceof TextChannel)) return;

  const message = await channel.messages.fetch(session.pingMessageId).catch(() => null);
  if (!message) {
    logger.warn(SCOPE, `Ping-Nachricht (${session.pingMessageId}) für Fall ${session.id} nicht mehr gefunden.`);
    return;
  }

  const row = buildSessionRow(session);

  await message
    .edit({ embeds: [buildSessionEmbed(session)], components: row ? [row] : [] })
    .catch((error) => logger.error(SCOPE, `Konnte Ping-Nachricht nicht aktualisieren (Fall ${session.id})`, error));
}
