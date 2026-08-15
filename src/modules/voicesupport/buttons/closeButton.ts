import { ButtonInteraction } from "discord.js";
import { ButtonHandler, PermissionLevel } from "../../../types";
import { buildEmbed } from "../../../utils/embeds";
import { logger } from "../../../utils/logger";
import { recordEvent } from "../../../utils/eventLog";
import { getSessionById, closeSession } from "../services/session";
import { getPermissionLevel } from "../../../utils/permissions";
import { updateSessionMessage } from "../services/pingMessage";
import { CLOSE_BUTTON_PREFIX } from "../services/embeds";

const SCOPE = "VoiceSupport/Close";

const handler: ButtonHandler = {
  customId: CLOSE_BUTTON_PREFIX,
  isPrefix: true,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId || !interaction.guild) return;

    const sessionId = interaction.customId.slice(CLOSE_BUTTON_PREFIX.length);
    const session = await getSessionById(sessionId);

    if (!session || session.status !== "CLAIMED") {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Nicht möglich", "Dieser Fall ist nicht (mehr) aktiv.")],
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const isAdmin = member ? getPermissionLevel(member) >= PermissionLevel.Admin : false;
    const isAssignedSupporter = session.claimedBy === interaction.user.id;

    if (!isAssignedSupporter && !isAdmin) {
      await interaction.reply({
        embeds: [
          buildEmbed.error(
            "🚫 Keine Berechtigung",
            `Nur <@${session.claimedBy}> (der zuständige Supporter) oder Admins können diesen Fall schließen.`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const closed = await closeSession(session.id, interaction.user.id);
    await updateSessionMessage(interaction.client, closed);

    // User aus dem Voice-Channel kicken.
    const waitingMember = await interaction.guild.members.fetch(session.userId).catch(() => null);
    if (waitingMember?.voice.channelId) {
      await waitingMember.voice.disconnect("Voice-Support-Fall geschlossen").catch((error) => {
        logger.error(SCOPE, `Konnte User nicht aus Voice-Channel entfernen (Fall ${session.id})`, error);
      });
    }

    await recordEvent({
      guildId: interaction.guildId,
      category: "voicesupport_geschlossen",
      executorId: interaction.user.id,
      targetId: session.userId,
    });

    await interaction.reply({
      embeds: [buildEmbed.success("✅ Fall geschlossen", "Der Fall wurde geschlossen und der User aus dem Voice-Channel entfernt.")],
      ephemeral: true,
    });
  },
};

export default handler;
