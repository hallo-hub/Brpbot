import { ModalSubmitInteraction, TextChannel } from "discord.js";
import { ModalHandler } from "../../../types";
import { logger } from "../../../utils/logger";
import { recordEvent } from "../../../utils/eventLog";
import { buildEmbed } from "../../../utils/embeds";
import { getOrCreateWelcomeSettings } from "../services/settings";
import { recordFeedback } from "../services/records";
import { buildFeedbackEmbed } from "../services/embeds";

export const FEEDBACK_MODAL_PREFIX = "willkommen_feedbackmodal:";

const SCOPE = "Willkommen/Feedback";

const handler: ModalHandler = {
  customId: FEEDBACK_MODAL_PREFIX,
  isPrefix: true,
  async execute(interaction: ModalSubmitInteraction) {
    const guildId = interaction.customId.slice(FEEDBACK_MODAL_PREFIX.length);
    const reason = interaction.fields.getTextInputValue("reason")?.trim() ?? "";

    await recordFeedback(guildId, interaction.user.id, reason);

    // Feedback im konfigurierten Team-Kanal posten (falls eingerichtet).
    const settings = await getOrCreateWelcomeSettings(guildId);

    if (settings.feedbackChannelId) {
      const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
      const channel = guild
        ? await guild.channels.fetch(settings.feedbackChannelId).catch(() => null)
        : null;

      if (channel instanceof TextChannel) {
        const embed = buildFeedbackEmbed({
          displayName: interaction.user.tag,
          userId: interaction.user.id,
          reason,
        });
        await channel.send({ embeds: [embed] }).catch((error) => {
          logger.error(SCOPE, `Konnte Feedback-Embed nicht senden (Guild ${guildId})`, error);
        });
      } else {
        logger.warn(SCOPE, `Konfigurierter Feedback-Kanal (${settings.feedbackChannelId}) nicht erreichbar.`);
      }
    }

    await recordEvent({
      guildId,
      category: "member_feedback",
      targetId: interaction.user.id,
      data: { hasReason: reason.length > 0 },
    });

    await interaction.reply({
      embeds: [
        buildEmbed.success(
          "✅ Danke für dein Feedback!",
          "Wir haben deine Rückmeldung erhalten. Danke, dass du dir die Zeit genommen hast."
        ),
      ],
      ephemeral: true,
    });
  },
};

export default handler;
