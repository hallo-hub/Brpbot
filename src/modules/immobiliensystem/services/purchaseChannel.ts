import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Guild,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { Property } from "@prisma/client";
import { prisma } from "../../../database/prisma";
import { config } from "../../../config/env";
import { buildEmbed } from "../../../utils/embeds";
import { formatEuro } from "./propertyFormat";
import { logger } from "../../../utils/logger";
import { buildFormButtonRow, buildFormRequestEmbed } from "./formular";

const SCOPE = "Immobiliensystem/PurchaseChannel";

export const CONFIRM_BUTTON_PREFIX = "immobilie_confirm:";
export const REJECT_BUTTON_PREFIX = "immobilie_reject:";
export const CONFIRM_YES_PREFIX = "immobilie_confirm_yes:";
export const CONFIRM_NO_PREFIX = "immobilie_confirm_no:";
export const REJECT_YES_PREFIX = "immobilie_reject_yes:";
export const REJECT_NO_PREFIX = "immobilie_reject_no:";

function sanitizeChannelName(username: string): string {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 20);
}

export function buildPurchaseEmbed(property: Property, buyerId: string, status: string) {
  return buildEmbed.primary("🏠 Immobilienkauf").addFields(
    { name: "Käufer", value: `<@${buyerId}>`, inline: true },
    { name: "Immobilie", value: `Nr. ${property.number}`, inline: true },
    { name: "Preis", value: formatEuro(property.price), inline: true },
    { name: "Status", value: status }
  ).setDescription(
    "Bitte sende hier deine **IC-Überweisung** und einen **Screenshot** als Zahlungsnachweis, Das Geld bitte an den User **Kavaro_13**. " +
      "Der Bot prüft keine Zahlungen automatisch – das Team bestätigt den Kauf manuell."
  );
}

export function buildConfirmRow(propertyId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CONFIRM_BUTTON_PREFIX}${propertyId}`)
      .setLabel("Bestätigen")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${REJECT_BUTTON_PREFIX}${propertyId}`)
      .setLabel("Ablehnen")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
  );
}

/**
 * Erstellt den privaten Kauf-Channel für eine reservierte Immobilie.
 * Sichtbar für Käufer + konfigurierte High-Team-Rollen (aus der Config).
 */
export async function createPurchaseChannel(
  guild: Guild,
  property: Property,
  buyerId: string,
  buyerUsername: string
): Promise<TextChannel> {
  const buyerMember = await guild.members.fetch(buyerId).catch(() => null);

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: buyerId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
    },
    ...config.roles.highTeam.map((roleId) => ({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
    })),
    ...config.roles.admin.map((roleId) => ({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
    })),
  ];

  const channel = await guild.channels.create({
    name: `🏠・immobilie-${property.number}-${sanitizeChannelName(buyerUsername)}`,
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites,
    reason: `Immobilien-System: Kaufprozess Nr. ${property.number} (${buyerMember?.user.tag ?? buyerId})`,
  });

  const embed = buildPurchaseEmbed(property, buyerId, "⏳ Warten auf Zahlung");
  const row = buildConfirmRow(property.id);

  await channel.send({ content: `<@${buyerId}>`, embeds: [embed], components: [row] }).catch((error) => {
    logger.error(SCOPE, `Konnte Kauf-Embed nicht senden (Channel ${channel.id})`, error);
  });

  // Formular automatisch anfordern, sobald der Kauf-Channel (Ticket) erstellt wurde.
  await channel
    .send({
      embeds: [buildFormRequestEmbed()],
      components: [buildFormButtonRow(property.id)],
    })
    .catch((error) => {
      logger.error(SCOPE, `Konnte Formular-Anfrage nicht senden (Channel ${channel.id})`, error);
    });

  await prisma.property.update({
    where: { id: property.id },
    data: { purchaseChannelId: channel.id },
  });

  return channel;
}

export function buildSafetyCheckRow(
  propertyId: string,
  kind: "confirm" | "reject"
): ActionRowBuilder<ButtonBuilder> {
  const yesPrefix = kind === "confirm" ? CONFIRM_YES_PREFIX : REJECT_YES_PREFIX;
  const noPrefix = kind === "confirm" ? CONFIRM_NO_PREFIX : REJECT_NO_PREFIX;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${yesPrefix}${propertyId}`).setLabel("Ja").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${noPrefix}${propertyId}`).setLabel("Nein").setStyle(ButtonStyle.Secondary)
  );
}
