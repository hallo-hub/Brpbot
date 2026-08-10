import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ButtonHandler, PermissionLevel } from "../../../types";
import { getOrCreateWelcomeSettings, updateWelcomeSettings } from "../services/settings";
import { buildSettingsPanelEmbed, buildSettingsPanelRows } from "../services/panel";
import {
  DEFAULT_LEAVE_DM_TEXT,
  DEFAULT_LEAVE_TEXT,
  DEFAULT_WELCOME_DM_TEXT,
  DEFAULT_WELCOME_TEXT,
} from "../services/texts";

const channelsButton: ButtonHandler = {
  customId: "willkommen_panel_channels",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const settings = await getOrCreateWelcomeSettings(interaction.guildId!);

    const modal = new ModalBuilder().setCustomId("willkommen_modal_channels").setTitle("Kanäle bearbeiten");

    const welcomeInput = new TextInputBuilder()
      .setCustomId("welcomeChannelId")
      .setLabel("Willkommen-Kanal (Kanal-ID)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.welcomeChannelId ?? "");

    const leaveInput = new TextInputBuilder()
      .setCustomId("leaveChannelId")
      .setLabel("Leave-Kanal (Kanal-ID)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.leaveChannelId ?? "");

    const feedbackInput = new TextInputBuilder()
      .setCustomId("feedbackChannelId")
      .setLabel("Feedback-Kanal (Kanal-ID)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.feedbackChannelId ?? "");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(welcomeInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(leaveInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(feedbackInput)
    );

    await interaction.showModal(modal);
  },
};

const textsButton: ButtonHandler = {
  customId: "willkommen_panel_texts",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const settings = await getOrCreateWelcomeSettings(interaction.guildId!);

    const modal = new ModalBuilder().setCustomId("willkommen_modal_texts").setTitle("Texte bearbeiten");

    const welcomeText = new TextInputBuilder()
      .setCustomId("welcomeText")
      .setLabel("Willkommen-Embed Text")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(1000)
      .setValue(settings.welcomeText ?? DEFAULT_WELCOME_TEXT);

    const welcomeDmText = new TextInputBuilder()
      .setCustomId("welcomeDmText")
      .setLabel("Willkommen-DM Text")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(1000)
      .setValue(settings.welcomeDmText ?? DEFAULT_WELCOME_DM_TEXT);

    const leaveText = new TextInputBuilder()
      .setCustomId("leaveText")
      .setLabel("Leave-Embed Text")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(1000)
      .setValue(settings.leaveText ?? DEFAULT_LEAVE_TEXT);

    const leaveDmText = new TextInputBuilder()
      .setCustomId("leaveDmText")
      .setLabel("Leave-DM Text")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(1000)
      .setValue(settings.leaveDmText ?? DEFAULT_LEAVE_DM_TEXT);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(welcomeText),
      new ActionRowBuilder<TextInputBuilder>().addComponents(welcomeDmText),
      new ActionRowBuilder<TextInputBuilder>().addComponents(leaveText),
      new ActionRowBuilder<TextInputBuilder>().addComponents(leaveDmText)
    );

    await interaction.showModal(modal);
  },
};

const designButton: ButtonHandler = {
  customId: "willkommen_panel_design",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const settings = await getOrCreateWelcomeSettings(interaction.guildId!);

    const modal = new ModalBuilder().setCustomId("willkommen_modal_design").setTitle("Darstellung bearbeiten");

    const colorInput = new TextInputBuilder()
      .setCustomId("embedColor")
      .setLabel("Embed-Farbe (Hex, z.B. 2b6cff)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.embedColor ?? "");

    const imageInput = new TextInputBuilder()
      .setCustomId("imageUrl")
      .setLabel("Bild-URL (Banner im Willkommen-Embed)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.imageUrl ?? "");

    const thumbnailInput = new TextInputBuilder()
      .setCustomId("thumbnailUrl")
      .setLabel("Thumbnail-URL (Standard: Server-Icon)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(settings.thumbnailUrl ?? "");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(thumbnailInput)
    );

    await interaction.showModal(modal);
  },
};

const toggleJoinDmButton: ButtonHandler = {
  customId: "willkommen_panel_toggle_joindm",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const current = await getOrCreateWelcomeSettings(interaction.guildId!);
    const updated = await updateWelcomeSettings(interaction.guildId!, {
      joinDmEnabled: !current.joinDmEnabled,
    });

    await interaction.update({
      embeds: [buildSettingsPanelEmbed(updated)],
      components: buildSettingsPanelRows(updated),
    });
  },
};

const toggleLeaveDmButton: ButtonHandler = {
  customId: "willkommen_panel_toggle_leavedm",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const current = await getOrCreateWelcomeSettings(interaction.guildId!);
    const updated = await updateWelcomeSettings(interaction.guildId!, {
      leaveDmEnabled: !current.leaveDmEnabled,
    });

    await interaction.update({
      embeds: [buildSettingsPanelEmbed(updated)],
      components: buildSettingsPanelRows(updated),
    });
  },
};

const handlers: ButtonHandler[] = [
  channelsButton,
  textsButton,
  designButton,
  toggleJoinDmButton,
  toggleLeaveDmButton,
];

export default handlers;
