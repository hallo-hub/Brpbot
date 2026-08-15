import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, PermissionLevel } from "../../../types";
import { buildEmbed } from "../../../utils/embeds";
import { addEntry, removeEntry, moveEntry } from "../services/entries";
import { updateTeamListSettings } from "../services/settings";
import { syncTeamList } from "../services/listMessage";

async function handleHinzufuegen(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const role = interaction.options.getRole("rolle", true);
  const label = interaction.options.getString("bezeichnung") ?? undefined;

  const entry = await addEntry(guildId, role.id, label);

  if (!entry) {
    await interaction.reply({
      embeds: [buildEmbed.error("❌ Fehler", `<@&${role.id}> ist bereits in der Team-Liste enthalten.`)],
      ephemeral: true,
    });
    return;
  }

  const result = await syncTeamList(interaction.client, guildId);
  if (!result.ok) {
    await interaction.reply({ embeds: [buildEmbed.error("❌ Fehler", result.reason)], ephemeral: true });
    return;
  }

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Rolle hinzugefügt", `<@&${role.id}> wurde zur Team-Liste hinzugefügt.`)],
    ephemeral: true,
  });
}

async function handleEntfernen(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const role = interaction.options.getRole("rolle", true);

  const removed = await removeEntry(guildId, role.id);
  if (!removed) {
    await interaction.reply({
      embeds: [buildEmbed.error("❌ Fehler", `<@&${role.id}> ist nicht in der Team-Liste enthalten.`)],
      ephemeral: true,
    });
    return;
  }

  await syncTeamList(interaction.client, guildId);

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Rolle entfernt", `<@&${role.id}> wurde aus der Team-Liste entfernt.`)],
    ephemeral: true,
  });
}

async function handleVerschieben(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const role = interaction.options.getRole("rolle", true);
  const richtung = interaction.options.getString("richtung", true) as "up" | "down";

  const moved = await moveEntry(guildId, role.id, richtung);
  if (!moved) {
    await interaction.reply({
      embeds: [buildEmbed.error("❌ Nicht möglich", "Die Rolle kann nicht in diese Richtung verschoben werden.")],
      ephemeral: true,
    });
    return;
  }

  await syncTeamList(interaction.client, guildId);

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Verschoben", `<@&${role.id}> wurde in der Reihenfolge verschoben.`)],
    ephemeral: true,
  });
}

async function handleKanal(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const channel = interaction.options.getChannel("kanal", true);

  await updateTeamListSettings(guildId, channel.id);
  const result = await syncTeamList(interaction.client, guildId, channel.id);

  if (!result.ok) {
    await interaction.reply({ embeds: [buildEmbed.error("❌ Fehler", result.reason)], ephemeral: true });
    return;
  }

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Kanal gesetzt", `Die Team-Liste wird jetzt in ${channel} angezeigt.`)],
    ephemeral: true,
  });
}

async function handleAnzeigen(interaction: ChatInputCommandInteraction) {
  const result = await syncTeamList(interaction.client, interaction.guildId!);

  if (!result.ok) {
    await interaction.reply({ embeds: [buildEmbed.error("❌ Fehler", result.reason)], ephemeral: true });
    return;
  }

  await interaction.reply({
    embeds: [buildEmbed.success("✅ Aktualisiert", "Die Team-Liste wurde synchronisiert.")],
    ephemeral: true,
  });
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("team-liste")
    .setDescription("Verwaltung der automatischen Team-Liste.")
    .addSubcommand((sub) =>
      sub
        .setName("rolle-hinzufügen")
        .setDescription("Fügt eine Rolle zur Team-Liste hinzu.")
        .addRoleOption((opt) => opt.setName("rolle").setDescription("Die Rolle").setRequired(true))
        .addStringOption((opt) => opt.setName("bezeichnung").setDescription("Optionale Anzeigebezeichnung (statt Rollenname)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("rolle-entfernen")
        .setDescription("Entfernt eine Rolle aus der Team-Liste.")
        .addRoleOption((opt) => opt.setName("rolle").setDescription("Die Rolle").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("verschieben")
        .setDescription("Ändert die Reihenfolge einer Rolle in der Liste.")
        .addRoleOption((opt) => opt.setName("rolle").setDescription("Die Rolle").setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName("richtung")
            .setDescription("Nach oben oder unten verschieben")
            .setRequired(true)
            .addChoices({ name: "Nach oben", value: "up" }, { name: "Nach unten", value: "down" })
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("kanal")
        .setDescription("Legt fest, in welchem Kanal die Team-Liste angezeigt wird.")
        .addChannelOption((opt) => opt.setName("kanal").setDescription("Zielkanal").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("anzeigen").setDescription("Aktualisiert die Team-Liste manuell.")),

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
      case "rolle-hinzufügen":
        await handleHinzufuegen(interaction);
        break;
      case "rolle-entfernen":
        await handleEntfernen(interaction);
        break;
      case "verschieben":
        await handleVerschieben(interaction);
        break;
      case "kanal":
        await handleKanal(interaction);
        break;
      case "anzeigen":
        await handleAnzeigen(interaction);
        break;
    }
  },
};

export default command;
