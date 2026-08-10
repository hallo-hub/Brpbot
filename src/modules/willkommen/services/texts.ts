import { GuildMember } from "discord.js";

export const DEFAULT_WELCOME_TEXT =
  "Willkommen {mention} 👋\n\nSchön, dass du Teil unserer Community bist.\nWir wünschen dir viel Spaß auf unserem Server!\n\n" +
  "━━━━━━━━━━━━\n\n📖 Regelwerk\n🔐 Verifizierung\n🎭 Rollen auswählen";

export const DEFAULT_WELCOME_DM_TEXT =
  "Schön, dass du beigetreten bist.\n\nHier findest du wichtige Informationen:\n\n" +
  "📖 Regelwerk\n🔐 Verifizierung\n🎭 Self Roles\n📢 Neuigkeiten";

export const DEFAULT_LEAVE_TEXT =
  "{user} hat {server} verlassen.\n\nWir bedanken uns für deine Zeit und wünschen dir alles Gute.";

export const DEFAULT_LEAVE_DM_TEXT =
  "Schade, dass du {server} verlassen hast.\n\nWenn du möchtest, kannst du uns helfen, den Server zu verbessern.\n\nWarum hast du den Server verlassen?";

interface PlaceholderValues {
  /** Anzeigename, z.B. für {user}. */
  displayName?: string;
  /** @Erwähnung für {mention}. Fällt auf displayName zurück, wenn kein Ping mehr möglich ist (z.B. nach Leave). */
  mention?: string;
  /** Reiner Discord-Username für {username}. */
  username?: string;
  serverName?: string;
}

/**
 * Ersetzt Platzhalter in einem konfigurierbaren Text.
 * Unterstützt: {user} (Anzeigename), {mention} (@Erwähnung), {username}
 * (reiner Discord-Username), {server} (Servername).
 */
export function replacePlaceholders(text: string, values: PlaceholderValues): string {
  const displayName = values.displayName ?? "Unbekannt";
  const mention = values.mention ?? displayName;
  const username = values.username ?? displayName;
  const serverName = values.serverName ?? "unserem Server";

  return text
    .replaceAll("{user}", displayName)
    .replaceAll("{mention}", mention)
    .replaceAll("{username}", username)
    .replaceAll("{server}", serverName);
}

/** Baut die Platzhalterwerte aus einem GuildMember (Join-Fall, Ping möglich). */
export function placeholdersFromMember(member: GuildMember, serverName: string): PlaceholderValues {
  return {
    displayName: member.displayName,
    mention: `<@${member.id}>`,
    username: member.user.username,
    serverName,
  };
}

/** Baut die Platzhalterwerte aus User+Namen ohne Guild-Kontext (Leave-Fall, kein Ping mehr möglich). */
export function placeholdersFromLeftUser(
  params: { displayName: string },
  serverName: string
): PlaceholderValues {
  return {
    displayName: params.displayName,
    mention: params.displayName,
    username: params.displayName,
    serverName,
  };
}
