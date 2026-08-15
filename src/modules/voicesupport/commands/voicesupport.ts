import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, PermissionLevel } from "../../../types";
import { buildEmbed } from "../../../utils/embeds";
import { getOrCreateVoiceSupportSettings } from "../services/settings";
import { buildVoiceSupportPanelEmbed, buildVoiceSupportPanelRow } from "../services/panel";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("voice-support")
    .setDescription("Verwaltung des Voice-Support-Systems.")
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
      const settings = await getOrCreateVoiceSupportSettings(interaction.guildId);

      await interaction.reply({
        embeds: [buildVoiceSupportPanelEmbed(settings)],
        components: [buildVoiceSupportPanelRow()],
        ephemeral: true,
      });
    }
  },
};

export default command;
