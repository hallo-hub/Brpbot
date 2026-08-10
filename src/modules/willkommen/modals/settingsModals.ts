import { ModalSubmitInteraction } from "discord.js";
import { ModalHandler, PermissionLevel } from "../../../types";
import { getOrCreateWelcomeSettings, updateWelcomeSettings } from "../services/settings";
import { buildSettingsPanelEmbed, buildSettingsPanelRows } from "../services/panel";
import { buildEmbed } from "../../../utils/embeds";

/** Liest ein Textfeld aus und gibt null zurück, wenn es leer ist (-> Feld auf "nicht gesetzt" zurücksetzen). */
function nullableValue(interaction: ModalSubmitInteraction, fieldId: string): string | null {
  const value = interaction.fields.getTextInputValue(fieldId).trim();
  return value.length > 0 ? value : null;
}

/** Prüft, ob ein String eine gültige Discord-Snowflake-ID ist. */
function isValidSnowflake(value: string): boolean {
  return /^\d{17,20}$/.test(value);
}

async function refreshPanel(interaction: ModalSubmitInteraction, guildId: string) {
  const updated = await getOrCreateWelcomeSettings(guildId);

  // Wenn das Modal über einen Button geöffnet wurde, existiert die
  // ursprüngliche Panel-Nachricht -> direkt aktualisieren (kein Duplikat).
  if (interaction.isFromMessage()) {
    await interaction.update({
      embeds: [buildSettingsPanelEmbed(updated)],
      components: buildSettingsPanelRows(updated),
    });
    return;
  }

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Gespeichert", "Die Einstellungen wurden aktualisiert.")],
    ephemeral: true,
  });
}

const channelsModal: ModalHandler = {
  customId: "willkommen_modal_channels",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ModalSubmitInteraction) {
    const guildId = interaction.guildId!;

    const welcomeChannelId = nullableValue(interaction, "welcomeChannelId");
    const leaveChannelId = nullableValue(interaction, "leaveChannelId");
    const feedbackChannelId = nullableValue(interaction, "feedbackChannelId");

    for (const [label, value] of [
      ["Willkommen-Kanal", welcomeChannelId],
      ["Leave-Kanal", leaveChannelId],
      ["Feedback-Kanal", feedbackChannelId],
    ] as const) {
      if (value && !isValidSnowflake(value)) {
        await interaction.reply({
          embeds: [
            buildEmbed.error(
              "❌ Ungültige Kanal-ID",
              `"${value}" ist keine gültige Kanal-ID (${label}). Bitte die reine Zahlen-ID des Kanals eintragen.`
            ),
          ],
          ephemeral: true,
        });
        return;
      }
    }

    await updateWelcomeSettings(guildId, { welcomeChannelId, leaveChannelId, feedbackChannelId });
    await refreshPanel(interaction, guildId);
  },
};

const textsModal: ModalHandler = {
  customId: "willkommen_modal_texts",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ModalSubmitInteraction) {
    const guildId = interaction.guildId!;

    await updateWelcomeSettings(guildId, {
      welcomeText: nullableValue(interaction, "welcomeText"),
      welcomeDmText: nullableValue(interaction, "welcomeDmText"),
      leaveText: nullableValue(interaction, "leaveText"),
      leaveDmText: nullableValue(interaction, "leaveDmText"),
    });

    await refreshPanel(interaction, guildId);
  },
};

const designModal: ModalHandler = {
  customId: "willkommen_modal_design",
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ModalSubmitInteraction) {
    const guildId = interaction.guildId!;

    const embedColorRaw = nullableValue(interaction, "embedColor");
    if (embedColorRaw && !/^#?[0-9a-fA-F]{6}$/.test(embedColorRaw)) {
      await interaction.reply({
        embeds: [
          buildEmbed.error(
            "❌ Ungültige Farbe",
            `"${embedColorRaw}" ist keine gültige Hex-Farbe. Beispiel: 2b6cff`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await updateWelcomeSettings(guildId, {
      embedColor: embedColorRaw ? embedColorRaw.replace("#", "") : null,
      imageUrl: nullableValue(interaction, "imageUrl"),
      thumbnailUrl: nullableValue(interaction, "thumbnailUrl"),
    });

    await refreshPanel(interaction, guildId);
  },
};

const handlers: ModalHandler[] = [channelsModal, textsModal, designModal];

export default handlers;
