import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ButtonHandler } from "../../../types";
import { FEEDBACK_MODAL_PREFIX } from "../modals/feedbackModal";

/**
 * Prefix der customId. Die tatsächliche guildId wird direkt angehängt
 * (siehe events/guildMemberRemove.ts), da der Button in einer DM erscheint
 * und dort kein Guild-Kontext mehr aus der Interaktion selbst verfügbar ist.
 */
export const FEEDBACK_BUTTON_PREFIX = "willkommen_feedback:";

const handler: ButtonHandler = {
  customId: FEEDBACK_BUTTON_PREFIX,
  isPrefix: true,
  async execute(interaction: ButtonInteraction) {
    const guildId = interaction.customId.slice(FEEDBACK_BUTTON_PREFIX.length);

    const modal = new ModalBuilder()
      .setCustomId(`${FEEDBACK_MODAL_PREFIX}${guildId}`)
      .setTitle("Austrittsfeedback");

    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Warum hast du den Server verlassen?")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(1000)
      .setPlaceholder("Freiwillige Angabe – hilft uns, den Server zu verbessern.");

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));

    await interaction.showModal(modal);
  },
};

export default handler;
