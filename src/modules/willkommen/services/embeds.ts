import { EmbedBuilder, GuildMember } from "discord.js";
import { WelcomeSettings } from "@prisma/client";
import { config } from "../../../config/env";
import {
  DEFAULT_LEAVE_TEXT,
  DEFAULT_WELCOME_TEXT,
  placeholdersFromLeftUser,
  placeholdersFromMember,
  replacePlaceholders,
} from "./texts";

/**
 * Wandelt einen in den Settings gespeicherten Hex-String (z.B. "#2b6cff"
 * oder "2b6cff") in eine Zahl um. Fällt bei ungültigem/leerem Wert auf die
 * zentrale Config-Farbe zurück, damit das Modul auch ohne eigene
 * Einstellungen zum einheitlichen Design passt.
 */
function resolveColor(hex: string | null | undefined, fallback: number): number {
  if (!hex) return fallback;
  const parsed = parseInt(hex.replace("#", ""), 16);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function withStandardFooter(embed: EmbedBuilder): EmbedBuilder {
  return embed
    .setFooter({ text: config.embed.footerText, iconURL: config.embed.footerIconUrl })
    .setTimestamp(new Date());
}

export function buildJoinEmbed(member: GuildMember, settings: WelcomeSettings): EmbedBuilder {
  const text = replacePlaceholders(
    settings.welcomeText ?? DEFAULT_WELCOME_TEXT,
    placeholdersFromMember(member, member.guild.name)
  );

  const embed = new EmbedBuilder()
    .setColor(resolveColor(settings.embedColor, config.embed.colorSuccess))
    .setTitle(`❤️ Herzlich Willkommen auf ${member.guild.name}!`)
    .setDescription(text)
    .setThumbnail(settings.thumbnailUrl ?? member.guild.iconURL({ size: 256 }) ?? null);

  if (settings.imageUrl) {
    embed.setImage(settings.imageUrl);
  }

  return withStandardFooter(embed);
}

export function buildJoinDmEmbed(text: string, guildName: string): EmbedBuilder {
  return withStandardFooter(
    new EmbedBuilder()
      .setColor(config.embed.colorPrimary)
      .setTitle(`👋 Willkommen auf ${guildName}!`)
      .setDescription(text)
  );
}

export function buildLeaveEmbed(
  params: { displayName: string; userId: string; guildName: string },
  settings: WelcomeSettings
): EmbedBuilder {
  const text = replacePlaceholders(
    settings.leaveText ?? DEFAULT_LEAVE_TEXT,
    placeholdersFromLeftUser({ displayName: params.displayName }, params.guildName)
  );

  return withStandardFooter(
    new EmbedBuilder()
      .setColor(resolveColor(settings.embedColor, config.embed.colorError))
      .setTitle("👋 Auf Wiedersehen!")
      .setDescription(text)
      .addFields(
        { name: "Anzeigename", value: params.displayName, inline: true },
        { name: "Benutzer-ID", value: params.userId, inline: true }
      )
  );
}

export function buildLeaveDmEmbed(text: string): EmbedBuilder {
  return withStandardFooter(
    new EmbedBuilder()
      .setColor(config.embed.colorWarning)
      .setTitle("👋 Schade, dass du gehst")
      .setDescription(text)
  );
}

export function buildFeedbackEmbed(params: {
  displayName: string;
  userId: string;
  reason: string;
}): EmbedBuilder {
  return withStandardFooter(
    new EmbedBuilder()
      .setColor(config.embed.colorPrimary)
      .setTitle("📤 Austrittsfeedback")
      .addFields(
        { name: "👤 Benutzer", value: params.displayName, inline: true },
        { name: "🆔 ID", value: params.userId, inline: true },
        { name: "📝 Grund", value: params.reason || "_Keine Angabe_" }
      )
  );
}
