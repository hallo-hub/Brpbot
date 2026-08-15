import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { RpSettings } from "@prisma/client";
import { buildEmbed } from "../../../utils/embeds";
import { parsePingRoleIds } from "./settings";

function channelValue(id: string | null): string {
  return id ? `<#${id}>` : "_nicht gesetzt_";
}

export function buildRpPanelEmbed(settings: RpSettings): EmbedBuilder {
  const roleIds = parsePingRoleIds(settings.pingRoleIds);
  const roles = roleIds.length > 0 ? roleIds.map((id) => `<@&${id}>`).join(" ") : "_keine_";

  return buildEmbed
    .primary("🎮 RP-Status – Einstellungen", "Verwalte hier alle Einstellungen des RP-Status-Systems.")
    .addFields(
      { name: "Status-Kanal", value: channelValue(settings.statusChannelId), inline: true },
      { name: "Ankündigungs-Kanal", value: channelValue(settings.announcementChannelId), inline: true },
      { name: "Servercode", value: settings.servercode ?? "_nicht gesetzt_", inline: true },
      { name: "Ping-Rollen", value: roles },
      { name: "Embed-Farbe", value: settings.embedColor ?? "_Standard_", inline: true }
    );
}

export function buildRpPanelRows(): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("rpstatus_panel_channels").setLabel("Kanäle").setEmoji("🔧").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("rpstatus_panel_general").setLabel("Servercode & Rollen").setEmoji("🔑").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("rpstatus_panel_texts").setLabel("Texte").setEmoji("📝").setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("rpstatus_panel_design").setLabel("Darstellung").setEmoji("🎨").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("rpstatus_panel_sync").setLabel("Status-Embed synchronisieren").setEmoji("🔄").setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}
