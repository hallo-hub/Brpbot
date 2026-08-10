import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { Property } from "@prisma/client";
import { buildEmbed } from "../../../utils/embeds";
import { formatEuro } from "./propertyFormat";

export const FORM_BUTTON_PREFIX = "immobilie_formular:";
export const FORM_MODAL_PREFIX = "immobilie_formular_modal:";

/** Embed, das direkt beim Erstellen des Kauf-Channels gesendet wird und zum Ausfüllen auffordert. */
export function buildFormRequestEmbed() {
  return buildEmbed.primary(
    "🏛️✨ BayernRP – Kauf / Verwaltung Formular ✨🏢",
    "Bitte fülle das Formular unten aus, damit das Team deinen Kauf bearbeiten kann.\n\n" +
      "Dein Name, die Objekt-ID und der Preis werden automatisch übernommen."
  );
}

export function buildFormButtonRow(propertyId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${FORM_BUTTON_PREFIX}${propertyId}`)
      .setLabel("Formular ausfüllen")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Primary)
  );
}

export function buildFormModal(propertyId: string): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`${FORM_MODAL_PREFIX}${propertyId}`)
    .setTitle("Kauf / Verwaltung Formular");

  const objektArt = new TextInputBuilder()
    .setCustomId("objektArt")
    .setLabel("🏗️ Art des Objekts (Bank, Haus, Club, ...)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const nutzung = new TextInputBuilder()
    .setCustomId("nutzung")
    .setLabel("🎯 Nutzung / Zweck")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  const rpGrund = new TextInputBuilder()
    .setCustomId("rpGrund")
    .setLabel("📜 RP-Grund für den Kauf")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  const zusatzInfo = new TextInputBuilder()
    .setCustomId("zusatzInfo")
    .setLabel("📝 Zusätzliche Informationen")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(objektArt),
    new ActionRowBuilder<TextInputBuilder>().addComponents(nutzung),
    new ActionRowBuilder<TextInputBuilder>().addComponents(rpGrund),
    new ActionRowBuilder<TextInputBuilder>().addComponents(zusatzInfo)
  );

  return modal;
}

/** Baut das fertig ausgefüllte Formular-Embed im exakt vorgegebenen Layout. */
export function buildCompletedFormEmbed(
  property: Property,
  buyerDisplayName: string,
  answers: { objektArt: string; nutzung: string; rpGrund: string; zusatzInfo: string }
) {
  return buildEmbed
    .primary("🏛️✨ BayernRP – Kauf / Verwaltung Formular ✨🏢")
    .addFields(
      { name: "1️⃣ 👤 Wie heißen Sie?", value: `➜ ${buyerDisplayName}` },
      { name: "2️⃣ 📍 Standort / Objekt-ID", value: `➜ Nr. ${property.number}` },
      { name: "3️⃣ 🏗️ Art des Objekts", value: `➜ ${answers.objektArt}` },
      { name: "5️⃣ 💰 Preis", value: `➜ ${formatEuro(property.price)}` },
      { name: "6️⃣ 🎯 Nutzung / Zweck", value: `➜ ${answers.nutzung}` },
      { name: "7️⃣ 📜 RP-Grund für den Kauf", value: `➜ ${answers.rpGrund}` },
      { name: "8️⃣ 📝 Zusätzliche Informationen", value: `➜ ${answers.zusatzInfo || "_Keine Angabe_"}` }
    );
}
