import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  TextChannel,
} from "discord.js";
import { prisma } from "../../../database/prisma";
import { getManagedMessage, upsertManagedMessage } from "../../../database/managedMessages";
import { buildEmbed } from "../../../utils/embeds";
import { logger } from "../../../utils/logger";
import { formatPropertyLine, sortProperties } from "./propertyFormat";

const SCOPE = "Immobiliensystem/List";

/** Eindeutiger Typ-Schlüssel für das ManagedMessage-System (siehe database/managedMessages). */
export const PROPERTY_LIST_MESSAGE_TYPE = "immobilien_liste";

export const BUY_BUTTON_CUSTOM_ID = "immobilie_kaufen_button";

function buildListEmbed(lines: string[]) {
  const body =
    lines.length > 0
      ? lines.join("\n")
      : "Aktuell sind keine Immobilien hinterlegt.";

  return buildEmbed.primary(
    "🏠 Immobilienliste",
    "Aktuelle Liste aller Immobilien.\nDrücke unten auf den Button, um eine Immobilie zu erwerben.\n\n" +
      "━━━━━━━━━━━━\n\n" +
      body +
      "\n\n━━━━━━━━━━━━"
  );
}

function buildBuyRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(BUY_BUTTON_CUSTOM_ID)
      .setLabel("Immobilie kaufen")
      .setEmoji("🏠")
      .setStyle(ButtonStyle.Success)
  );
}

/**
 * Aktualisiert die öffentliche Immobilienliste. Existiert bereits eine
 * gespeicherte Nachricht (ManagedMessage), wird sie bearbeitet – es wird
 * NIEMALS eine neue Nachricht gesendet, solange die alte noch existiert.
 * Nur wenn die Nachricht z.B. manuell gelöscht wurde, wird eine neue
 * gesendet und die Referenz aktualisiert.
 *
 * @param channelIdForInitialSend Wird nur verwendet, falls noch KEINE
 *   Liste existiert (erster Aufruf via /immobilie liste #kanal).
 */
export async function syncPropertyList(
  client: Client,
  guildId: string,
  channelIdForInitialSend?: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const properties = sortProperties(
    await prisma.property.findMany({ where: { guildId } })
  );

  const lines = properties.map(formatPropertyLine);
  const embed = buildListEmbed(lines);
  const row = buildBuyRow();

  const existing = await getManagedMessage(guildId, PROPERTY_LIST_MESSAGE_TYPE);

  const targetChannelId = existing?.channelId ?? channelIdForInitialSend;

  if (!targetChannelId) {
    return {
      ok: false,
      reason:
        "Es existiert noch keine Immobilienliste und es wurde kein Kanal angegeben. " +
        "Nutze `/immobilie liste kanal:#kanal` für die Ersteinrichtung.",
    };
  }

  const channel = await client.channels.fetch(targetChannelId).catch(() => null);
  if (!channel || !(channel instanceof TextChannel)) {
    return { ok: false, reason: `Der hinterlegte Kanal (<#${targetChannelId}>) ist nicht (mehr) erreichbar.` };
  }

  // Fall 1: Es gibt bereits eine gespeicherte Nachricht -> versuchen zu bearbeiten.
  if (existing) {
    const message = await channel.messages.fetch(existing.messageId).catch(() => null);

    if (message) {
      await message.edit({ embeds: [embed], components: [row] });
      return { ok: true };
    }

    // Nachricht wurde manuell gelöscht -> neu senden und Referenz aktualisieren.
    logger.warn(
      SCOPE,
      `Gespeicherte Immobilienliste (Message ${existing.messageId}) nicht mehr gefunden, sende neu.`
    );
  }

  // Fall 2: Keine (mehr) existierende Nachricht -> einmalig neu senden.
  const sent = await channel.send({ embeds: [embed], components: [row] });
  await upsertManagedMessage({
    guildId,
    channelId: channel.id,
    messageId: sent.id,
    type: PROPERTY_LIST_MESSAGE_TYPE,
  });

  return { ok: true };
}
