import { StringSelectMenuInteraction } from "discord.js";
import { PropertyStatus } from "@prisma/client";
import { SelectMenuHandler } from "../../../types";
import { prisma } from "../../../database/prisma";
import { buildEmbed } from "../../../utils/embeds";
import { logger } from "../../../utils/logger";
import { recordEvent } from "../../../utils/eventLog";
import { syncPropertyList } from "../services/propertyList";
import { createPurchaseChannel } from "../services/purchaseChannel";
import { BUY_SELECT_CUSTOM_ID } from "../buttons/kaufenButton";

const SCOPE = "Immobiliensystem/Kauf";

const handler: SelectMenuHandler = {
  customId: BUY_SELECT_CUSTOM_ID,
  async execute(interaction: StringSelectMenuInteraction) {
    if (!interaction.guildId || !interaction.guild) return;

    const propertyId = interaction.values[0];

    // Reservierung atomar durchführen: nur reservieren, wenn der Status zum
    // Zeitpunkt des Updates noch FREE ist. Verhindert, dass zwei Nutzer
    // gleichzeitig dieselbe Immobilie reservieren (Race Condition).
    const result = await prisma.property.updateMany({
      where: { id: propertyId, guildId: interaction.guildId, status: PropertyStatus.FREE },
      data: {
        status: PropertyStatus.RESERVED,
        reservedBy: interaction.user.id,
        reservedAt: new Date(),
      },
    });

    if (result.count === 0) {
      await interaction.update({
        embeds: [
          buildEmbed.error(
            "❌ Nicht mehr verfügbar",
            "Diese Immobilie wurde inzwischen von jemand anderem reserviert oder ist nicht mehr frei."
          ),
        ],
        components: [],
      });
      return;
    }

    const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });

    await syncPropertyList(interaction.client, interaction.guildId);

    let channel;
    try {
      channel = await createPurchaseChannel(
        interaction.guild,
        property,
        interaction.user.id,
        interaction.user.username
      );
    } catch (error) {
      logger.error(SCOPE, `Konnte Kauf-Channel nicht erstellen (Immobilie ${property.number})`, error);

      // Rollback: Reservierung wieder aufheben, damit die Immobilie nicht
      // dauerhaft "verloren" geht, wenn der Channel nicht erstellt werden konnte.
      await prisma.property.update({
        where: { id: property.id },
        data: { status: PropertyStatus.FREE, reservedBy: null, reservedAt: null },
      });
      await syncPropertyList(interaction.client, interaction.guildId);

      await interaction.update({
        embeds: [
          buildEmbed.error(
            "❌ Fehler",
            "Der Kauf-Channel konnte nicht erstellt werden. Die Immobilie wurde wieder freigegeben. Bitte versuche es erneut."
          ),
        ],
        components: [],
      });
      return;
    }

    await recordEvent({
      guildId: interaction.guildId,
      category: "immobilie_reserviert",
      executorId: interaction.user.id,
      targetId: property.id,
      data: { nummer: property.number, preis: property.price },
    });

    await interaction.update({
      embeds: [
        buildEmbed.success(
          "🏠 Immobilie reserviert",
          `Nr. ${property.number} wurde für dich reserviert. Bitte fahre in ${channel} mit dem Kaufprozess fort.`
        ),
      ],
      components: [],
    });
  },
};

export default handler;
