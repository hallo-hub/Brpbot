import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { Command, PermissionLevel } from "../types";
import { buildEmbed } from "../utils/embeds";

/**
 * Grundgerüst des /dashboard-Panels. Enthält aktuell nur die drei
 * vorbereiteten Buttons (Module / Einstellungen / Statistiken). Die Buttons
 * selbst leiten aktuell auf einen "noch keine Module installiert"-Hinweis –
 * sobald z.B. das Immobilien-Modul existiert, hängt es sich hier über
 * client.modules automatisch ein, ohne dass dieser Command angefasst werden muss.
 */

export const DASHBOARD_MANAGED_MESSAGE_TYPE = "dashboard_panel";

export function buildDashboardEmbed() {
  return buildEmbed.primary(
    "⚙️ BayernRP Dashboard",
    "Zentrale Verwaltung des BayernRP All-in-One Bots.\n\n" +
      "Wähle unten einen Bereich aus. Weitere Module erscheinen hier automatisch, sobald sie installiert sind."
  );
}

export function buildDashboardRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("dashboard_modules")
      .setLabel("Module")
      .setEmoji("🏠")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("dashboard_settings")
      .setLabel("Einstellungen")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dashboard_stats")
      .setLabel("Statistiken")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Secondary)
  );
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("dashboard")
    .setDescription("Öffnet das BayernRP All-in-One Verwaltungspanel."),

  // Das Dashboard ist bewusst mindestens dem Team vorbehalten – Anpassung
  // jederzeit über die Rollen-IDs in der Config möglich.
  permissionLevel: PermissionLevel.Team,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.channelId) {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Fehler", "Dieser Command funktioniert nur auf einem Server.")],
        ephemeral: true,
      });
      return;
    }

    const embed = buildDashboardEmbed();
    const row = buildDashboardRow();

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  },
};

export default command;
