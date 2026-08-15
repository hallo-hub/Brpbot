import { EmbedBuilder } from "discord.js";
import { RpSettings, RpStatus, RpStatusValue } from "@prisma/client";
import { config } from "../../../config/env";
import { formatGermanTime } from "./texts";

/** Eigener Footer für dieses Modul, wie im Beispiel-Layout vorgegeben (statt des globalen Standard-Footers). */
const STATUS_FOOTER = "BayernRP RP-System";

function resolveColor(hex: string | null | undefined, fallback: number): number {
  if (!hex) return fallback;
  const parsed = parseInt(hex.replace("#", ""), 16);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** Baut das dauerhafte Status-Embed im vorgegebenen Layout (offen/geschlossen). */
export function buildStatusEmbed(status: RpStatus, settings: RpSettings): EmbedBuilder {
  const isOpen = status.status === RpStatusValue.OPEN;
  const color = resolveColor(
    settings.embedColor,
    isOpen ? config.embed.colorSuccess : config.embed.colorError
  );

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle("🎮 BayernRP Status")
    .setDescription("━━━━━━━━━━━━━━")
    .setFooter({ text: STATUS_FOOTER })
    .setTimestamp(new Date());

  if (isOpen) {
    embed.addFields(
      { name: "Aktueller Status", value: "🟢 RP geöffnet" },
      { name: "Gestartet von", value: status.startedBy ? `<@${status.startedBy}>` : "_Unbekannt_" },
      { name: "Seit", value: status.startedAt ? formatGermanTime(status.startedAt) : "_Unbekannt_" }
    );
  } else {
    embed.addFields(
      { name: "Aktueller Status", value: "🔴 RP geschlossen" },
      { name: "Beendet von", value: status.endedBy ? `<@${status.endedBy}>` : "_Noch nie gestartet_" },
      { name: "Beendet um", value: status.endedAt ? formatGermanTime(status.endedAt) : "_Unbekannt_" }
    );
  }

  return embed;
}

export function buildAnnouncementEmbed(text: string, settings: RpSettings, isOpen: boolean): EmbedBuilder {
  const color = resolveColor(
    settings.embedColor,
    isOpen ? config.embed.colorSuccess : config.embed.colorWarning
  );

  return new EmbedBuilder()
    .setColor(color)
    .setDescription(text)
    .setFooter({ text: STATUS_FOOTER })
    .setTimestamp(new Date());
}
