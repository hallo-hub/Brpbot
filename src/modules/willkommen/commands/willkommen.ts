import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, PermissionLevel } from "../../../types";
import { buildEmbed } from "../../../utils/embeds";
import { getOrCreateWelcomeSettings } from "../services/settings";
import { buildSettingsPanelEmbed, buildSettingsPanelRows } from "../services/panel";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("willkommen")
    .setDescription("Verwaltung des Willkommen & Verabschiedung Moduls.")
    .addSubcommand((sub) =>
      sub.setName("einstellungen").setDescription("Öffnet das Einstellungs-Panel für dieses Modul.")
    ),

  permissionLevel: PermissionLevel.HighTeam,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Fehler", "Dieser Command funktioniert nur auf einem Server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "einstellungen") {
      const settings = await getOrCreateWelcomeSettings(interaction.guildId);

      await interaction.reply({
        embeds: [buildSettingsPanelEmbed(settings)],
        components: buildSettingsPanelRows(settings),
        ephemeral: true,
      });
    }
  },
};

export default command;
