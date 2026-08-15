import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ButtonHandler, PermissionLevel } from "../../../types";
import { getOrCreateRpSettings } from "../services/settings";
import { buildRpPanelEmbed, buildRpPanelRows } from "../services/panel";
import { syncStatusMessage } from "../services/statusMessage";
import { buildEmbed } from "../../../utils/embeds";
import { DEFAULT_RP_START_TEXT, DEFAULT_RP_STOP_TEXT } from "../services/texts";

const channelsButton: ButtonHandler = {
  customId: "rpstatus_panel_channels",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const settings = await getOrCreateRpSettings(interaction.guildId!);

    const modal = new ModalBuilder().setCustomId("rpstatus_modal_channels").setTitle("Kanäle bearbeiten");

    const statusChannel = new TextInputBuilder()
      .setCustomId("statusChannelId")
      .setLabel("Status-Kanal (Kanal-ID)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.statusChannelId ?? "");

    const announcementChannel = new TextInputBuilder()
      .setCustomId("announcementChannelId")
      .setLabel("Ankündigungs-Kanal (Kanal-ID)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.announcementChannelId ?? "");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(statusChannel),
      new ActionRowBuilder<TextInputBuilder>().addComponents(announcementChannel)
    );

    await interaction.showModal(modal);
  },
};

const generalButton: ButtonHandler = {
  customId: "rpstatus_panel_general",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const settings = await getOrCreateRpSettings(interaction.guildId!);

    const modal = new ModalBuilder().setCustomId("rpstatus_modal_general").setTitle("Servercode & Ping-Rollen");

    const servercode = new TextInputBuilder()
      .setCustomId("servercode")
      .setLabel("Servercode")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(100)
      .setValue(settings.servercode ?? "");

    const pingRoles = new TextInputBuilder()
      .setCustomId("pingRoleIds")
      .setLabel("Ping-Rollen (Rollen-IDs, kommagetrennt)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.pingRoleIds ?? "");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(servercode),
      new ActionRowBuilder<TextInputBuilder>().addComponents(pingRoles)
    );

    await interaction.showModal(modal);
  },
};

const textsButton: ButtonHandler = {
  customId: "rpstatus_panel_texts",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const settings = await getOrCreateRpSettings(interaction.guildId!);

    const modal = new ModalBuilder().setCustomId("rpstatus_modal_texts").setTitle("RP-Start/Stop Texte");

    const startText = new TextInputBuilder()
      .setCustomId("rpStartText")
      .setLabel("RP-Start Nachricht ({servercode}, {roles})")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(2000)
      .setValue(settings.rpStartText ?? DEFAULT_RP_START_TEXT);

    const stopText = new TextInputBuilder()
      .setCustomId("rpStopText")
      .setLabel("RP-Stop Nachricht ({roles})")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(2000)
      .setValue(settings.rpStopText ?? DEFAULT_RP_STOP_TEXT);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(startText),
      new ActionRowBuilder<TextInputBuilder>().addComponents(stopText)
    );

    await interaction.showModal(modal);
  },
};

const designButton: ButtonHandler = {
  customId: "rpstatus_panel_design",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const settings = await getOrCreateRpSettings(interaction.guildId!);

    const modal = new ModalBuilder().setCustomId("rpstatus_modal_design").setTitle("Darstellung bearbeiten");

    const color = new TextInputBuilder()
      .setCustomId("embedColor")
      .setLabel("Embed-Farbe (Hex, z.B. 2b6cff)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.embedColor ?? "");

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(color));

    await interaction.showModal(modal);
  },
};

const syncButton: ButtonHandler = {
  customId: "rpstatus_panel_sync",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const result = await syncStatusMessage(interaction.client, interaction.guildId!);

    if (!result.ok) {
      await interaction.reply({ embeds: [buildEmbed.error("❌ Fehler", result.reason)], ephemeral: true });
      return;
    }

    await interaction.reply({
      embeds: [buildEmbed.success("✅ Synchronisiert", "Das Status-Embed wurde aktualisiert.")],
      ephemeral: true,
    });
  },
};

const handlers: ButtonHandler[] = [channelsButton, generalButton, textsButton, designButton, syncButton];

export default handlers;
