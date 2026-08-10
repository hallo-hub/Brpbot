import { ActionRowBuilder, ButtonInteraction, StringSelectMenuBuilder } from "discord.js";
import { ButtonHandler } from "../../../types";
import { prisma } from "../../../database/prisma";
import { buildEmbed } from "../../../utils/embeds";
import { formatEuro, sortProperties } from "../services/propertyFormat";
import { BUY_BUTTON_CUSTOM_ID } from "../services/propertyList";
import { PropertyStatus } from "@prisma/client";

export const BUY_SELECT_CUSTOM_ID = "immobilie_kaufen_select";

const handler: ButtonHandler = {
  customId: BUY_BUTTON_CUSTOM_ID,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId) return;

    const freeProperties = sortProperties(
      await prisma.property.findMany({
        where: { guildId: interaction.guildId, status: PropertyStatus.FREE },
      })
    );

    if (freeProperties.length === 0) {
      await interaction.reply({
        embeds: [buildEmbed.warning("🏠 Keine freien Immobilien", "Aktuell ist keine Immobilie verfügbar.")],
        ephemeral: true,
      });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(BUY_SELECT_CUSTOM_ID)
      .setPlaceholder("Wähle eine Immobilie aus ...")
      .addOptions(
        freeProperties.slice(0, 25).map((property) => ({
          label: `🏠 Nr. ${property.number} - ${formatEuro(property.price)}`,
          value: property.id,
        }))
      );

    await interaction.reply({
      embeds: [buildEmbed.primary("🏠 Immobilie kaufen", "Wähle unten die gewünschte Immobilie aus.")],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      ephemeral: true,
    });
  },
};

export default handler;
