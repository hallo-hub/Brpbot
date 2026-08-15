import { ModalSubmitInteraction } from "discord.js";
import { ModalHandler, PermissionLevel } from "../../../types";
import { getOrCreateRpSettings, updateRpSettings } from "../services/settings";
import { buildRpPanelEmbed, buildRpPanelRows } from "../services/panel";
import { buildEmbed } from "../../../utils/embeds";

function nullableValue(interaction: ModalSubmitInteraction, fieldId: string): string | null {
  const value = interaction.fields.getTextInputValue(fieldId).trim();
  return value.length > 0 ? value : null;
}

function isValidSnowflake(value: string): boolean {
  return /^\d{17,20}$/.test(value);
}

function isValidSnowflakeList(value: string): boolean {
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .every(isValidSnowflake);
}

async function refreshPanel(interaction: ModalSubmitInteraction, guildId: string) {
  const updated = await getOrCreateRpSettings(guildId);

  if (interaction.isFromMessage()) {
    await interaction.update({ embeds: [buildRpPanelEmbed(updated)], components: buildRpPanelRows() });
    return;
  }

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Gespeichert", "Die Einstellungen wurden aktualisiert.")],
    ephemeral: true,
  });
}

const channelsModal: ModalHandler = {
  customId: "rpstatus_modal_channels",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ModalSubmitInteraction) {
    const guildId = interaction.guildId!;

    const statusChannelId = nullableValue(interaction, "statusChannelId");
    const announcementChannelId = nullableValue(interaction, "announcementChannelId");

    for (const value of [statusChannelId, announcementChannelId]) {
      if (value && !isValidSnowflake(value)) {
        await interaction.reply({
          embeds: [buildEmbed.error("❌ Ungültige Kanal-ID", `"${value}" ist keine gültige Kanal-ID.`)],
          ephemeral: true,
        });
        return;
      }
    }

    await updateRpSettings(guildId, { statusChannelId, announcementChannelId });
    await refreshPanel(interaction, guildId);
  },
};

const generalModal: ModalHandler = {
  customId: "rpstatus_modal_general",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ModalSubmitInteraction) {
    const guildId = interaction.guildId!;

    const servercode = nullableValue(interaction, "servercode");
    const pingRoleIds = nullableValue(interaction, "pingRoleIds");

    if (pingRoleIds && !isValidSnowflakeList(pingRoleIds)) {
      await interaction.reply({
        embeds: [
          buildEmbed.error(
            "❌ Ungültige Rollen-IDs",
            "Bitte nur gültige, kommagetrennte Rollen-IDs eintragen, z.B. `123456789012345678,987654321098765432`."
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await updateRpSettings(guildId, { servercode, pingRoleIds });
    await refreshPanel(interaction, guildId);
  },
};

const textsModal: ModalHandler = {
  customId: "rpstatus_modal_texts",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ModalSubmitInteraction) {
    const guildId = interaction.guildId!;

    await updateRpSettings(guildId, {
      rpStartText: nullableValue(interaction, "rpStartText"),
      rpStopText: nullableValue(interaction, "rpStopText"),
    });

    await refreshPanel(interaction, guildId);
  },
};

const designModal: ModalHandler = {
  customId: "rpstatus_modal_design",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ModalSubmitInteraction) {
    const guildId = interaction.guildId!;

    const embedColorRaw = nullableValue(interaction, "embedColor");
    if (embedColorRaw && !/^#?[0-9a-fA-F]{6}$/.test(embedColorRaw)) {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Ungültige Farbe", `"${embedColorRaw}" ist keine gültige Hex-Farbe. Beispiel: 2b6cff`)],
        ephemeral: true,
      });
      return;
    }

    await updateRpSettings(guildId, { embedColor: embedColorRaw ? embedColorRaw.replace("#", "") : null });
    await refreshPanel(interaction, guildId);
  },
};

const handlers: ModalHandler[] = [channelsModal, generalModal, textsModal, designModal];

export default handlers;
