import { ActionRowBuilder, ButtonInteraction, StringSelectMenuBuilder } from "discord.js";
import { ButtonHandler } from "../../../types";
import { buildEmbed } from "../../../utils/embeds";
import { getSessionById } from "../services/session";
import { getOrCreateVoiceSupportSettings, memberHasAnyRole, resolveClaimRoleIds } from "../services/settings";
import { HANDOVER_BUTTON_PREFIX } from "../services/embeds";

export const HANDOVER_SELECT_CUSTOM_ID = "voicesupport_handover_select";

const handler: ButtonHandler = {
  customId: HANDOVER_BUTTON_PREFIX,
  isPrefix: true,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId || !interaction.guild) return;

    const sessionId = interaction.customId.slice(HANDOVER_BUTTON_PREFIX.length);
    const session = await getSessionById(sessionId);

    if (!session || session.status !== "CLAIMED") {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Nicht möglich", "Dieser Fall ist nicht (mehr) aktiv.")],
        ephemeral: true,
      });
      return;
    }

    if (session.claimedBy !== interaction.user.id) {
      await interaction.reply({
        embeds: [buildEmbed.error("🚫 Keine Berechtigung", "Nur der aktuell zuständige Supporter kann den Fall übergeben.")],
        ephemeral: true,
      });
      return;
    }

    const voiceChannel = await interaction.guild.channels.fetch(session.channelId).catch(() => null);
    if (!voiceChannel || !voiceChannel.isVoiceBased()) {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Fehler", "Der Voice-Channel dieses Falls ist nicht mehr erreichbar.")],
        ephemeral: true,
      });
      return;
    }

    const settings = await getOrCreateVoiceSupportSettings(interaction.guildId);
    const claimRoleIds = resolveClaimRoleIds(settings);

    const eligibleMembers = voiceChannel.members.filter(
      (m) => !m.user.bot && m.id !== interaction.user.id && m.id !== session.userId && memberHasAnyRole(m, claimRoleIds)
    );

    if (eligibleMembers.size === 0) {
      await interaction.reply({
        embeds: [
          buildEmbed.warning(
            "🔄 Keine Übergabe möglich",
            "Aktuell befindet sich kein anderer berechtigter Supporter im selben Voice-Channel."
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`${HANDOVER_SELECT_CUSTOM_ID}:${session.id}`)
      .setPlaceholder("Wähle den neuen zuständigen Supporter ...")
      .addOptions(
        eligibleMembers
          .first(25)
          .map((m) => ({ label: m.displayName, value: m.id }))
      );

    await interaction.reply({
      embeds: [buildEmbed.primary("🔄 Fall übergeben", "Wähle unten, an wen der Fall übergeben werden soll.")],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      ephemeral: true,
    });
  },
};

export default handler;
