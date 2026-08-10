import { ButtonInteraction } from "discord.js";
import { PropertyStatus } from "@prisma/client";
import { ButtonHandler, PermissionLevel } from "../../../types";
import { prisma } from "../../../database/prisma";
import { buildEmbed } from "../../../utils/embeds";
import { logger } from "../../../utils/logger";
import { recordEvent } from "../../../utils/eventLog";
import { syncPropertyList } from "../services/propertyList";
import { transferPropertyRole } from "../services/propertyRoles";
import {
  buildPurchaseEmbed,
  buildSafetyCheckRow,
  buildConfirmRow,
  CONFIRM_BUTTON_PREFIX,
  CONFIRM_NO_PREFIX,
  CONFIRM_YES_PREFIX,
  REJECT_BUTTON_PREFIX,
  REJECT_NO_PREFIX,
  REJECT_YES_PREFIX,
} from "../services/purchaseChannel";

const SCOPE = "Immobiliensystem/Bestaetigung";

function propertyIdFromCustomId(customId: string, prefix: string): string {
  return customId.slice(prefix.length);
}

/** Baut die "Bist du sicher?"-Zwischenfrage im selben Embed. */
async function askSafetyCheck(
  interaction: ButtonInteraction,
  propertyId: string,
  kind: "confirm" | "reject"
) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });

  if (!property) {
    await interaction.reply({
      embeds: [buildEmbed.error("❌ Fehler", "Diese Immobilie wurde nicht gefunden.")],
      ephemeral: true,
    });
    return;
  }

  const question =
    kind === "confirm"
      ? "Bist du sicher, dass du diese Immobilie vergeben möchtest?"
      : "Bist du sicher, dass du diesen Kauf ablehnen möchtest? Die Immobilie wird wieder freigegeben.";

  await interaction.update({
    embeds: [buildEmbed.warning("⚠️ Sicherheitsabfrage", question)],
    components: [buildSafetyCheckRow(propertyId, kind)],
  });
}

/** Setzt das Kauf-Embed nach einem "Nein" wieder auf den Ausgangszustand zurück. */
async function restorePurchaseEmbed(interaction: ButtonInteraction, propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });

  if (!property || !property.reservedBy) {
    await interaction.update({
      embeds: [buildEmbed.error("❌ Fehler", "Diese Reservierung existiert nicht mehr.")],
      components: [],
    });
    return;
  }

  await interaction.update({
    embeds: [buildPurchaseEmbed(property, property.reservedBy, "⏳ Warten auf Zahlung")],
    components: [buildConfirmRow(propertyId)],
  });
}

const confirmButton: ButtonHandler = {
  customId: CONFIRM_BUTTON_PREFIX,
  isPrefix: true,
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const propertyId = propertyIdFromCustomId(interaction.customId, CONFIRM_BUTTON_PREFIX);
    await askSafetyCheck(interaction, propertyId, "confirm");
  },
};

const rejectButton: ButtonHandler = {
  customId: REJECT_BUTTON_PREFIX,
  isPrefix: true,
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const propertyId = propertyIdFromCustomId(interaction.customId, REJECT_BUTTON_PREFIX);
    await askSafetyCheck(interaction, propertyId, "reject");
  },
};

const confirmYesButton: ButtonHandler = {
  customId: CONFIRM_YES_PREFIX,
  isPrefix: true,
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId || !interaction.guild) return;

    const propertyId = propertyIdFromCustomId(interaction.customId, CONFIRM_YES_PREFIX);
    const property = await prisma.property.findUnique({ where: { id: propertyId } });

    if (!property || property.status !== PropertyStatus.RESERVED || !property.reservedBy) {
      await interaction.update({
        embeds: [buildEmbed.error("❌ Fehler", "Diese Immobilie ist nicht (mehr) reserviert.")],
        components: [],
      });
      return;
    }

    const buyerId = property.reservedBy;
    const buyerMember = await interaction.guild.members.fetch(buyerId).catch(() => null);
    const ownerDisplayName = buyerMember?.displayName ?? buyerMember?.user.username ?? "Unbekannt";

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: {
        status: PropertyStatus.SOLD,
        ownerId: buyerId,
        ownerDisplayName,
        reservedBy: null,
        reservedAt: null,
      },
    });

    await transferPropertyRole(interaction.guild, updated, buyerId);
    await syncPropertyList(interaction.client, interaction.guildId);

    await recordEvent({
      guildId: interaction.guildId,
      category: "immobilie_verkauft",
      executorId: interaction.user.id,
      targetId: buyerId,
      data: { nummer: property.number, preis: property.price },
    });

    await interaction.update({
      embeds: [buildPurchaseEmbed(updated, buyerId, `✅ Verkauft (bestätigt von <@${interaction.user.id}>)`)],
      components: [],
    });
  },
};

const confirmNoButton: ButtonHandler = {
  customId: CONFIRM_NO_PREFIX,
  isPrefix: true,
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const propertyId = propertyIdFromCustomId(interaction.customId, CONFIRM_NO_PREFIX);
    await restorePurchaseEmbed(interaction, propertyId);
  },
};

const rejectYesButton: ButtonHandler = {
  customId: REJECT_YES_PREFIX,
  isPrefix: true,
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId) return;

    const propertyId = propertyIdFromCustomId(interaction.customId, REJECT_YES_PREFIX);
    const property = await prisma.property.findUnique({ where: { id: propertyId } });

    if (!property) {
      await interaction.update({
        embeds: [buildEmbed.error("❌ Fehler", "Diese Immobilie wurde nicht gefunden.")],
        components: [],
      });
      return;
    }

    const rejectedBuyerId = property.reservedBy;

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: { status: PropertyStatus.FREE, reservedBy: null, reservedAt: null },
    });

    await syncPropertyList(interaction.client, interaction.guildId);

    await recordEvent({
      guildId: interaction.guildId,
      category: "immobilie_abgelehnt",
      executorId: interaction.user.id,
      targetId: rejectedBuyerId ?? undefined,
      data: { nummer: property.number },
    });

    await interaction.update({
      embeds: [
        buildEmbed.error(
          "❌ Kauf abgelehnt",
          `Der Kauf von Immobilie Nr. ${updated.number} wurde von <@${interaction.user.id}> abgelehnt. ` +
            "Die Immobilie ist wieder frei verfügbar."
        ),
      ],
      components: [],
    });
  },
};

const rejectNoButton: ButtonHandler = {
  customId: REJECT_NO_PREFIX,
  isPrefix: true,
  permissionLevel: PermissionLevel.HighTeam,
  async execute(interaction: ButtonInteraction) {
    const propertyId = propertyIdFromCustomId(interaction.customId, REJECT_NO_PREFIX);
    await restorePurchaseEmbed(interaction, propertyId);
  },
};

const handlers: ButtonHandler[] = [
  confirmButton,
  rejectButton,
  confirmYesButton,
  confirmNoButton,
  rejectYesButton,
  rejectNoButton,
];

export default handlers;
