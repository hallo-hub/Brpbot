import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { PropertyStatus } from "@prisma/client";
import { Command, PermissionLevel } from "../../../types";
import { prisma } from "../../../database/prisma";
import { buildEmbed } from "../../../utils/embeds";
import { recordEvent } from "../../../utils/eventLog";
import { formatEuro } from "../services/propertyFormat";
import { syncPropertyList } from "../services/propertyList";
import { deletePropertyRole, revokePropertyRole, transferPropertyRole } from "../services/propertyRoles";

async function handleErstellen(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const nummer = interaction.options.getString("nummer", true).trim();
  const preis = interaction.options.getInteger("preis", true);

  const existing = await prisma.property.findUnique({ where: { guildId_number: { guildId, number: nummer } } });
  if (existing) {
    await interaction.reply({
      embeds: [buildEmbed.error("❌ Fehler", `Es existiert bereits eine Immobilie mit der Nummer **${nummer}**.`)],
      ephemeral: true,
    });
    return;
  }

  await prisma.property.create({ data: { guildId, number: nummer, price: preis } });
  await syncPropertyList(interaction.client, guildId, interaction.channelId ?? undefined);

  await recordEvent({
    guildId,
    category: "immobilie_erstellt",
    executorId: interaction.user.id,
    data: { nummer, preis },
  });

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Immobilie erstellt", `Nr. **${nummer}** für ${formatEuro(preis)} wurde angelegt.`)],
    ephemeral: true,
  });
}

async function handleBearbeiten(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const nummer = interaction.options.getString("nummer", true).trim();
  const neuerPreis = interaction.options.getInteger("preis");
  const neuerStatus = interaction.options.getString("status") as PropertyStatus | null;
  const neuerBesitzer = interaction.options.getUser("besitzer");

  const property = await prisma.property.findUnique({ where: { guildId_number: { guildId, number: nummer } } });
  if (!property) {
    await interaction.reply({
      embeds: [buildEmbed.error("❌ Fehler", `Keine Immobilie mit der Nummer **${nummer}** gefunden.`)],
      ephemeral: true,
    });
    return;
  }

  const data: Record<string, unknown> = {};
  if (neuerPreis !== null) data.price = neuerPreis;
  if (neuerStatus) data.status = neuerStatus;

  if (neuerBesitzer) {
    const member = await interaction.guild!.members.fetch(neuerBesitzer.id).catch(() => null);
    data.ownerId = neuerBesitzer.id;
    data.ownerDisplayName = member?.displayName ?? neuerBesitzer.username;
    data.status = PropertyStatus.SOLD;
  }

  const updated = await prisma.property.update({ where: { id: property.id }, data });

  if (neuerBesitzer) {
    await transferPropertyRole(interaction.guild!, updated, neuerBesitzer.id);
  }

  await syncPropertyList(interaction.client, guildId);

  await recordEvent({
    guildId,
    category: "immobilie_bearbeitet",
    executorId: interaction.user.id,
    targetId: property.id,
    data: { nummer, aenderungen: data },
  });

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Immobilie aktualisiert", `Nr. **${nummer}** wurde bearbeitet.`)],
    ephemeral: true,
  });
}

async function handleLoeschen(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const nummer = interaction.options.getString("nummer", true).trim();

  const property = await prisma.property.findUnique({ where: { guildId_number: { guildId, number: nummer } } });
  if (!property) {
    await interaction.reply({
      embeds: [buildEmbed.error("❌ Fehler", `Keine Immobilie mit der Nummer **${nummer}** gefunden.`)],
      ephemeral: true,
    });
    return;
  }

  await revokePropertyRole(interaction.guild!, property);
  await deletePropertyRole(interaction.guild!, property);
  await prisma.property.delete({ where: { id: property.id } });
  await syncPropertyList(interaction.client, guildId);

  await recordEvent({
    guildId,
    category: "immobilie_geloescht",
    executorId: interaction.user.id,
    data: { nummer },
  });

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Immobilie gelöscht", `Nr. **${nummer}** wurde entfernt.`)],
    ephemeral: true,
  });
}

async function handleFreigeben(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const nummer = interaction.options.getString("nummer", true).trim();

  const property = await prisma.property.findUnique({ where: { guildId_number: { guildId, number: nummer } } });
  if (!property) {
    await interaction.reply({
      embeds: [buildEmbed.error("❌ Fehler", `Keine Immobilie mit der Nummer **${nummer}** gefunden.`)],
      ephemeral: true,
    });
    return;
  }

  await revokePropertyRole(interaction.guild!, property);

  await prisma.property.update({
    where: { id: property.id },
    data: {
      status: PropertyStatus.FREE,
      ownerId: null,
      ownerDisplayName: null,
      reservedBy: null,
      reservedAt: null,
    },
  });

  await syncPropertyList(interaction.client, guildId);

  await recordEvent({
    guildId,
    category: "immobilie_freigegeben",
    executorId: interaction.user.id,
    data: { nummer },
  });

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Immobilie freigegeben", `Nr. **${nummer}** ist jetzt wieder frei.`)],
    ephemeral: true,
  });
}

async function handleListe(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const kanal = interaction.options.getChannel("kanal");

  const result = await syncPropertyList(interaction.client, guildId, kanal?.id);

  if (!result.ok) {
    await interaction.reply({ embeds: [buildEmbed.error("❌ Fehler", result.reason)], ephemeral: true });
    return;
  }

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Liste aktualisiert", "Die Immobilienliste wurde synchronisiert.")],
    ephemeral: true,
  });
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("immobilie")
    .setDescription("Verwaltung des Immobilien-Systems.")
    .addSubcommand((sub) =>
      sub
        .setName("erstellen")
        .setDescription("Legt eine neue Immobilie an.")
        .addStringOption((opt) => opt.setName("nummer").setDescription("Immobiliennummer, z.B. 1 oder 41A").setRequired(true))
        .addIntegerOption((opt) => opt.setName("preis").setDescription("Preis in Euro").setRequired(true).setMinValue(0))
    )
    .addSubcommand((sub) =>
      sub
        .setName("bearbeiten")
        .setDescription("Bearbeitet eine bestehende Immobilie.")
        .addStringOption((opt) => opt.setName("nummer").setDescription("Immobiliennummer").setRequired(true))
        .addIntegerOption((opt) => opt.setName("preis").setDescription("Neuer Preis in Euro").setMinValue(0))
        .addStringOption((opt) =>
          opt
            .setName("status")
            .setDescription("Neuer Status")
            .addChoices(
              { name: "Frei", value: PropertyStatus.FREE },
              { name: "Reserviert", value: PropertyStatus.RESERVED },
              { name: "Verkauft", value: PropertyStatus.SOLD }
            )
        )
        .addUserOption((opt) => opt.setName("besitzer").setDescription("Neuer Besitzer (setzt Status automatisch auf Verkauft)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("löschen")
        .setDescription("Löscht eine Immobilie unwiderruflich.")
        .addStringOption((opt) => opt.setName("nummer").setDescription("Immobiliennummer").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("freigeben")
        .setDescription("Setzt eine Immobilie zurück auf frei.")
        .addStringOption((opt) => opt.setName("nummer").setDescription("Immobiliennummer").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("liste")
        .setDescription("Aktualisiert die öffentliche Immobilienliste (bei Ersteinrichtung Kanal angeben).")
        .addChannelOption((opt) => opt.setName("kanal").setDescription("Zielkanal für die Erstveröffentlichung"))
    ),

  permissionLevel: PermissionLevel.HighTeam,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Fehler", "Dieser Command funktioniert nur auf einem Server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "erstellen":
        await handleErstellen(interaction);
        break;
      case "bearbeiten":
        await handleBearbeiten(interaction);
        break;
      case "löschen":
        await handleLoeschen(interaction);
        break;
      case "freigeben":
        await handleFreigeben(interaction);
        break;
      case "liste":
        await handleListe(interaction);
        break;
    }
  },
};

export default command;
