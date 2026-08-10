import { ModalSubmitInteraction } from "discord.js";
import { ModalHandler } from "../../../types";
import { prisma } from "../../../database/prisma";
import { buildEmbed } from "../../../utils/embeds";
import { recordEvent } from "../../../utils/eventLog";
import { FORM_MODAL_PREFIX, buildCompletedFormEmbed } from "../services/formular";

const handler: ModalHandler = {
  customId: FORM_MODAL_PREFIX,
  isPrefix: true,
  async execute(interaction: ModalSubmitInteraction) {
    const propertyId = interaction.customId.slice(FORM_MODAL_PREFIX.length);

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || !interaction.guildId) {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Fehler", "Diese Immobilie wurde nicht gefunden.")],
        ephemeral: true,
      });
      return;
    }

    const objektArt = interaction.fields.getTextInputValue("objektArt").trim();
    const nutzung = interaction.fields.getTextInputValue("nutzung").trim();
    const rpGrund = interaction.fields.getTextInputValue("rpGrund").trim();
    const zusatzInfo = interaction.fields.getTextInputValue("zusatzInfo").trim();

    await prisma.property.update({
      where: { id: property.id },
      data: {
        formObjektArt: objektArt,
        formNutzung: nutzung,
        formRpGrund: rpGrund,
        formZusatzInfo: zusatzInfo || null,
        formSubmittedAt: new Date(),
      },
    });

    const buyerMember = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
    const buyerDisplayName = buyerMember?.displayName ?? interaction.user.username;

    const formEmbed = buildCompletedFormEmbed(property, buyerDisplayName, {
      objektArt,
      nutzung,
      rpGrund,
      zusatzInfo,
    });

    // Formular für das Team im Kauf-Channel posten (nicht ephemeral).
    await interaction.reply({ embeds: [formEmbed] });

    // Button auf der ursprünglichen Anfrage-Nachricht entfernen, damit das
    // Formular nicht doppelt ausgefüllt werden kann.
    if (interaction.isFromMessage()) {
      await interaction.message.edit({ components: [] }).catch(() => {
        // Nicht kritisch, falls die Nachricht nicht mehr bearbeitbar ist.
      });
    }

    await recordEvent({
      guildId: interaction.guildId,
      category: "immobilie_formular_eingereicht",
      executorId: interaction.user.id,
      targetId: property.id,
      data: { nummer: property.number, objektArt },
    });
  },
};

export default handler;
