import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { VoiceSupportSettings } from "@prisma/client";
import { buildEmbed } from "../../../utils/embeds";
import { parseIdList } from "./settings";

function channelValue(id: string | null): string {
  return id ? `<#${id}>` : "_nicht gesetzt_";
}

export function buildVoiceSupportPanelEmbed(settings: VoiceSupportSettings): EmbedBuilder {
  const pingRoles = parseIdList(settings.pingRoleIds);
  const claimRoles = parseIdList(settings.claimRoleIds);

  return buildEmbed
    .primary("🎧 Voice-Support – Einstellungen", "Verwalte hier alle Einstellungen des Voice-Support-Systems.")
    .addFields(
      { name: "Warteraum", value: channelValue(settings.waitingRoomChannelId), inline: true },
      { name: "Ping-Kanal", value: channelValue(settings.pingChannelId), inline: true },
      { name: "Ping-Rollen", value: pingRoles.length > 0 ? pingRoles.map((id) => `<@&${id}>`).join(" ") : "_keine_" },
      {
        name: "Übernahme-Rollen",
        value: claimRoles.length > 0 ? claimRoles.map((id) => `<@&${id}>`).join(" ") : "_Standard: Team/High-Team/Admin_",
      }
    );
}

export function buildVoiceSupportPanelRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("voicesupport_panel_edit")
      .setLabel("Einstellungen bearbeiten")
      .setEmoji("🔧")
      .setStyle(ButtonStyle.Primary)
  );
}
