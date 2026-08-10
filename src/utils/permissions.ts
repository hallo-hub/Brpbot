import { GuildMember } from "discord.js";
import { config } from "../config/env";
import { PermissionLevel } from "../types";

/**
 * Ermittelt die höchste Berechtigungsstufe eines GuildMembers anhand seiner
 * Rollen, verglichen mit den in der Config hinterlegten Rollen-IDs
 * (ROLE_ADMIN, ROLE_HIGH_TEAM, ROLE_TEAM). Jede Stufe schließt die
 * darunterliegenden ein (Admin darf alles, was Team darf, usw.).
 */
export function getPermissionLevel(member: GuildMember): PermissionLevel {
  const roleIds = member.roles.cache.map((role) => role.id);

  // Server-Owner und Mitglieder mit Administrator-Recht gelten immer als Admin.
  if (member.permissions.has("Administrator") || member.guild.ownerId === member.id) {
    return PermissionLevel.Admin;
  }

  if (roleIds.some((id) => config.roles.admin.includes(id))) {
    return PermissionLevel.Admin;
  }

  if (roleIds.some((id) => config.roles.highTeam.includes(id))) {
    return PermissionLevel.HighTeam;
  }

  if (roleIds.some((id) => config.roles.team.includes(id))) {
    return PermissionLevel.Team;
  }

  return PermissionLevel.Everyone;
}

/** Prüft, ob ein Member mindestens die angegebene Berechtigungsstufe hat. */
export function hasPermissionLevel(
  member: GuildMember,
  required: PermissionLevel
): boolean {
  return getPermissionLevel(member) >= required;
}

/** Menschlich lesbarer Name einer Berechtigungsstufe (für Fehlermeldungen). */
export function permissionLevelLabel(level: PermissionLevel): string {
  switch (level) {
    case PermissionLevel.Admin:
      return "Admin";
    case PermissionLevel.HighTeam:
      return "High Team";
    case PermissionLevel.Team:
      return "Team";
    case PermissionLevel.Everyone:
    default:
      return "Jeder";
  }
}
