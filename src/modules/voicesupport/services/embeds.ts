import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { VoiceSupportSession } from "@prisma/client";
import { buildEmbed } from "../../../utils/embeds";

export const CLAIM_BUTTON_PREFIX = "voicesupport_claim:";
export const CLOSE_BUTTON_PREFIX = "voicesupport_close:";
export const HANDOVER_BUTTON_PREFIX = "voicesupport_handover:";

function formatGermanTime(date: Date): string {
  return `${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })} Uhr`;
}

/** Baut das Ping-Embed für einen Voice-Support-Fall (wartend/übernommen/geschlossen). */
export function buildSessionEmbed(session: VoiceSupportSession): EmbedBuilder {
  if (session.status === "WAITING") {
    return buildEmbed
      .warning("🎧 Neue Voice-Support-Anfrage")
      .addFields(
        { name: "User", value: `<@${session.userId}>`, inline: true },
        { name: "Voice-Channel", value: `<#${session.channelId}>`, inline: true },
        { name: "Zeit", value: formatGermanTime(session.createdAt), inline: true },
        { name: "Status", value: "🟡 Wartet auf Übernahme" }
      );
  }

  if (session.status === "CLAIMED") {
    return buildEmbed
      .primary("🎧 Voice-Support-Anfrage")
      .addFields(
        { name: "User", value: `<@${session.userId}>`, inline: true },
        { name: "Voice-Channel", value: `<#${session.channelId}>`, inline: true },
        { name: "Zeit", value: formatGermanTime(session.createdAt), inline: true },
        { name: "Status", value: `🟢 Übernommen von: <@${session.claimedBy}>` }
      );
  }

  return buildEmbed
    .success("🎧 Voice-Support-Anfrage erledigt")
    .addFields(
      { name: "User", value: `<@${session.userId}>`, inline: true },
      { name: "Zeit", value: formatGermanTime(session.createdAt), inline: true },
      {
        name: "Status",
        value: `✅ Geschlossen von <@${session.closedBy}>${session.closedAt ? ` um ${formatGermanTime(session.closedAt)}` : ""}`,
      }
    );
}

export function buildSessionRow(session: VoiceSupportSession): ActionRowBuilder<ButtonBuilder> | null {
  if (session.status === "WAITING") {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CLAIM_BUTTON_PREFIX}${session.id}`)
        .setLabel("Übernehmen")
        .setEmoji("🙋")
        .setStyle(ButtonStyle.Success)
    );
  }

  if (session.status === "CLAIMED") {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CLOSE_BUTTON_PREFIX}${session.id}`)
        .setLabel("Fall schließen")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${HANDOVER_BUTTON_PREFIX}${session.id}`)
        .setLabel("Übergeben")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return null; // Geschlossen -> keine Buttons mehr.
}
