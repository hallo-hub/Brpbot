import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { ButtonHandler, PermissionLevel } from "../../../types";
import { getOrCreateVoiceSupportSettings } from "../services/settings";

const handler: ButtonHandler = {
  customId: "voicesupport_panel_edit",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const settings = await getOrCreateVoiceSupportSettings(interaction.guildId!);

    const modal = new ModalBuilder().setCustomId("voicesupport_modal_edit").setTitle("Voice-Support Einstellungen");

    const waitingRoom = new TextInputBuilder()
      .setCustomId("waitingRoomChannelId")
      .setLabel("Warteraum (Voice-Channel-ID)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.waitingRoomChannelId ?? "");

    const pingChannel = new TextInputBuilder()
      .setCustomId("pingChannelId")
      .setLabel("Ping-Kanal (Text-Kanal-ID)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.pingChannelId ?? "");

    const pingRoles = new TextInputBuilder()
      .setCustomId("pingRoleIds")
      .setLabel("Ping-Rollen (Rollen-IDs, kommagetrennt)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.pingRoleIds ?? "");

    const claimRoles = new TextInputBuilder()
      .setCustomId("claimRoleIds")
      .setLabel("Übernahme-Rollen (leer = Team/High-Team/Admin)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.claimRoleIds ?? "");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(waitingRoom),
      new ActionRowBuilder<TextInputBuilder>().addComponents(pingChannel),
      new ActionRowBuilder<TextInputBuilder>().addComponents(pingRoles),
      new ActionRowBuilder<TextInputBuilder>().addComponents(claimRoles)
    );

    await interaction.showModal(modal);
  },
};

export default handler;
