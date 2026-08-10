import { ButtonInteraction } from "discord.js";
import { ButtonHandler } from "../../../types";
import { prisma } from "../../../database/prisma";
import { buildEmbed } from "../../../utils/embeds";
import { FORM_BUTTON_PREFIX, buildFormModal } from "../services/formular";

const handler: ButtonHandler = {
  customId: FORM_BUTTON_PREFIX,
  isPrefix: true,
  async execute(interaction: ButtonInteraction) {
    const propertyId = interaction.customId.slice(FORM_BUTTON_PREFIX.length);

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Fehler", "Diese Immobilie wurde nicht gefunden.")],
        ephemeral: true,
      });
      return;
    }

    // Nur der Käufer selbst darf das Formular für sein eigenes Ticket ausfüllen.
    if (property.reservedBy && property.reservedBy !== interaction.user.id && property.ownerId !== interaction.user.id) {
      await interaction.reply({
        embeds: [buildEmbed.error("🚫 Keine Berechtigung", "Nur der Käufer kann dieses Formular ausfüllen.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.showModal(buildFormModal(propertyId));
  },
};

export default handler;
