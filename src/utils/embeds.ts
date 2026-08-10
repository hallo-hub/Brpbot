import { EmbedBuilder } from "discord.js";
import { config } from "../config/env";

/**
 * Einheitliches Embed-System. ALLE Module sollen ihre Embeds über diese
 * Builder erzeugen, damit Farben, Footer und Zeitangaben serverweit
 * konsistent aussehen – anstatt dass jedes Modul sein eigenes EmbedBuilder-
 * Setup macht.
 */

type EmbedKind = "primary" | "success" | "error" | "warning";

function colorFor(kind: EmbedKind): number {
  switch (kind) {
    case "success":
      return config.embed.colorSuccess;
    case "error":
      return config.embed.colorError;
    case "warning":
      return config.embed.colorWarning;
    case "primary":
    default:
      return config.embed.colorPrimary;
  }
}

function withStandardFooter(embed: EmbedBuilder): EmbedBuilder {
  embed.setFooter({
    text: config.embed.footerText,
    iconURL: config.embed.footerIconUrl,
  });
  embed.setTimestamp(new Date());
  return embed;
}

function baseEmbed(kind: EmbedKind, title?: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(colorFor(kind));
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return withStandardFooter(embed);
}

export const buildEmbed = {
  /** Standard-Embed im BayernRP-Design (blau/neutral). */
  primary: (title?: string, description?: string) => baseEmbed("primary", title, description),

  /** Grünes Erfolgs-Embed, z.B. für Bestätigungen. */
  success: (title?: string, description?: string) => baseEmbed("success", title, description),

  /** Rotes Fehler-Embed. */
  error: (title?: string, description?: string) => baseEmbed("error", title, description),

  /** Gelbes Warn-/Hinweis-Embed, z.B. für offene Bewerbungen. */
  warning: (title?: string, description?: string) => baseEmbed("warning", title, description),

  /** Leeres Embed mit nur Farbe + Footer, für individuellen Aufbau. */
  blank: (kind: EmbedKind = "primary") => baseEmbed(kind),
};
