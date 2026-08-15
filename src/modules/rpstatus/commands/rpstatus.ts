import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, PermissionLevel } from "../../../types";
import { buildEmbed } from "../../../utils/embeds";
import { getOrCreateRpSettings } from "../services/settings";
import { buildRpPanelEmbed, buildRpPanelRows } from "../services/panel";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("rp-status")
    .setDescription("Verwaltung des RP-Status-Systems.")
    .addSubcommand((sub) => sub.setName("einstellungen").setDescription("Öffnet das Einstellungs-Panel für dieses Modul.")),

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
      const settings = await getOrCreateRpSettings(interaction.guildId);

      await interaction.reply({
        embeds: [buildRpPanelEmbed(settings)],
        components: buildRpPanelRows(),
        ephemeral: true,
      });
    }
  },
};

export default command;
