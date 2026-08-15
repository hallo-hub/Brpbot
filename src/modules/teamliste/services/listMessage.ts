import { Client, Guild, TextChannel } from "discord.js";
import { getManagedMessage, upsertManagedMessage } from "../../../database/managedMessages";
import { buildEmbed } from "../../../utils/embeds";
import { logger } from "../../../utils/logger";
import { listEntries } from "./entries";
import { getOrCreateTeamListSettings } from "./settings";

const SCOPE = "TeamListe/ListMessage";

export const TEAM_LIST_MESSAGE_TYPE = "team_liste";

async function buildTeamListEmbed(guild: Guild) {
  const entries = await listEntries(guild.id);

  if (entries.length === 0) {
    return buildEmbed.primary(
      "📋 Team-Liste",
      "Es sind noch keine Rollen konfiguriert. Nutze `/team-liste rolle-hinzufügen`."
    );
  }

  // Ohne vollständigen Member-Cache würde role.members nur zwischengespeicherte
  // Mitglieder zeigen (unvollständig). Einmal vollständig laden für Korrektheit.
  await guild.members.fetch().catch((error) => {
    logger.warn(SCOPE, `Konnte Mitgliederliste nicht vollständig laden (Guild ${guild.id})`, error);
  });

  const embed = buildEmbed.primary("📋 Team-Liste", "Übersicht aller Teamrollen und deren Mitglieder.");

  for (const entry of entries) {
    const role = await guild.roles.fetch(entry.roleId).catch(() => null);

    if (!role) {
      embed.addFields({ name: entry.label ?? "Unbekannte Rolle", value: "_Rolle nicht mehr gefunden_" });
      continue;
    }

    const members = [...role.members.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "de"));
    const value = members.length > 0 ? members.map((m) => `<@${m.id}>`).join("\n") : "_Niemand_";

    embed.addFields({ name: `${entry.label ?? role.name} (${members.length})`, value });
  }

  return embed;
}

/**
 * Aktualisiert die dauerhafte Team-Liste. Existiert bereits eine gespeicherte
 * Nachricht, wird sie bearbeitet – niemals eine neue Nachricht bei bestehender.
 */
export async function syncTeamList(
  client: Client,
  guildId: string,
  channelIdForInitialSend?: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const settings = await getOrCreateTeamListSettings(guildId);
  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) return { ok: false, reason: "Server nicht erreichbar." };

  const targetChannelId = settings.channelId ?? channelIdForInitialSend;
  if (!targetChannelId) {
    return {
      ok: false,
      reason: "Es ist noch kein Kanal für die Team-Liste konfiguriert. Nutze `/team-liste kanal`.",
    };
  }

  const channel = await client.channels.fetch(targetChannelId).catch(() => null);
  if (!channel || !(channel instanceof TextChannel)) {
    return { ok: false, reason: `Der konfigurierte Kanal (<#${targetChannelId}>) ist nicht erreichbar.` };
  }

  const embed = await buildTeamListEmbed(guild);
  const existing = await getManagedMessage(guildId, TEAM_LIST_MESSAGE_TYPE);

  if (existing) {
    const message = await channel.messages.fetch(existing.messageId).catch(() => null);

    if (message) {
      await message.edit({ embeds: [embed] });
      return { ok: true };
    }

    logger.warn(SCOPE, `Gespeicherte Team-Liste (Message ${existing.messageId}) nicht mehr gefunden, sende neu.`);
  }

  const sent = await channel.send({ embeds: [embed] });
  await upsertManagedMessage({ guildId, channelId: channel.id, messageId: sent.id, type: TEAM_LIST_MESSAGE_TYPE });

  return { ok: true };
}
