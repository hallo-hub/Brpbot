import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { WelcomeSettings } from "@prisma/client";
import { buildEmbed } from "../../../utils/embeds";

function channelValue(id: string | null): string {
  return id ? `<#${id}>` : "_nicht gesetzt_";
}

function toggleValue(enabled: boolean): string {
  return enabled ? "✅ An" : "❌ Aus";
}

export function buildSettingsPanelEmbed(settings: WelcomeSettings): EmbedBuilder {
  return buildEmbed.primary(
    "👋 Willkommen & Verabschiedung – Einstellungen",
    "Verwalte hier alle Einstellungen dieses Moduls. Änderungen wirken sich sofort auf den nächsten " +
      "Beitritt/Austritt aus."
  ).addFields(
    { name: "Willkommen-Kanal", value: channelValue(settings.welcomeChannelId), inline: true },
    { name: "Leave-Kanal", value: channelValue(settings.leaveChannelId), inline: true },
    { name: "Feedback-Kanal", value: channelValue(settings.feedbackChannelId), inline: true },
    { name: "Join-DM", value: toggleValue(settings.joinDmEnabled), inline: true },
    { name: "Leave-DM", value: toggleValue(settings.leaveDmEnabled), inline: true },
    { name: "Embed-Farbe", value: settings.embedColor ?? "_Standard_", inline: true }
  );
}

export function buildSettingsPanelRows(settings: WelcomeSettings): ActionRowBuilder<ButtonBuilder>[] {
  const editRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("willkommen_panel_channels")
      .setLabel("Kanäle bearbeiten")
      .setEmoji("🔧")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("willkommen_panel_texts")
      .setLabel("Texte bearbeiten")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("willkommen_panel_design")
      .setLabel("Darstellung bearbeiten")
      .setEmoji("🎨")
      .setStyle(ButtonStyle.Primary)
  );

  const toggleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("willkommen_panel_toggle_joindm")
      .setLabel(`Join-DM: ${settings.joinDmEnabled ? "An" : "Aus"}`)
      .setStyle(settings.joinDmEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("willkommen_panel_toggle_leavedm")
      .setLabel(`Leave-DM: ${settings.leaveDmEnabled ? "An" : "Aus"}`)
      .setStyle(settings.leaveDmEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  return [editRow, toggleRow];
}
