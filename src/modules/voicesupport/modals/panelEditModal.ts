import { ModalSubmitInteraction } from "discord.js";
import { ModalHandler, PermissionLevel } from "../../../types";
import { getOrCreateVoiceSupportSettings, updateVoiceSupportSettings } from "../services/settings";
import { buildVoiceSupportPanelEmbed, buildVoiceSupportPanelRow } from "../services/panel";
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

const handler: ModalHandler = {
  customId: "voicesupport_modal_edit",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ModalSubmitInteraction) {
    const guildId = interaction.guildId!;

    const waitingRoomChannelId = nullableValue(interaction, "waitingRoomChannelId");
    const pingChannelId = nullableValue(interaction, "pingChannelId");
    const pingRoleIds = nullableValue(interaction, "pingRoleIds");
    const claimRoleIds = nullableValue(interaction, "claimRoleIds");

    for (const value of [waitingRoomChannelId, pingChannelId]) {
      if (value && !isValidSnowflake(value)) {
        await interaction.reply({
          embeds: [buildEmbed.error("❌ Ungültige Kanal-ID", `"${value}" ist keine gültige Kanal-ID.`)],
          ephemeral: true,
        });
        return;
      }
    }

    for (const value of [pingRoleIds, claimRoleIds]) {
      if (value && !isValidSnowflakeList(value)) {
        await interaction.reply({
          embeds: [buildEmbed.error("❌ Ungültige Rollen-IDs", "Bitte nur gültige, kommagetrennte Rollen-IDs eintragen.")],
          ephemeral: true,
        });
        return;
      }
    }

    await updateVoiceSupportSettings(guildId, { waitingRoomChannelId, pingChannelId, pingRoleIds, claimRoleIds });

    const updated = await getOrCreateVoiceSupportSettings(guildId);

    if (interaction.isFromMessage()) {
      await interaction.update({ embeds: [buildVoiceSupportPanelEmbed(updated)], components: [buildVoiceSupportPanelRow()] });
      return;
    }

    await interaction.reply({
      embeds: [buildEmbed.success("✅ Gespeichert", "Die Einstellungen wurden aktualisiert.")],
      ephemeral: true,
    });
  },
};

export default handler;
