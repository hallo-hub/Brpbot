export const DEFAULT_RP_START_TEXT =
  "💎 RP-START 💎\n\n" +
  "Liebe Bürgerinnen und Bürger,\n\n" +
  "das Roleplay auf BayernRP VC ist ab sofort wieder geöffnet! 🥳\n\n" +
  "🚓 Spannende Einsätze\n🚑 Realistisches Roleplay\n👥 Freundliche Community\n🎉 Jede Menge Spielspaß\n\n" +
  "🔑 Servercode:\n\"{servercode}\"\n\n" +
  "Wir freuen uns auf euch und wünschen allen ein erfolgreiches sowie spaßiges RP! 💙\n\n" +
  "{roles}";

export const DEFAULT_RP_STOP_TEXT =
  "💤 RP-STOP 💤\n\n" +
  "Liebe Bürgerinnen und Bürger,\n\n" +
  "hiermit wird das Roleplay auf BayernRP VC für heute offiziell beendet.\n\n" +
  "🔒 Der Server bleibt weiterhin online.\n🚫 Es werden ab sofort keine Support-Fälle mehr bearbeitet.\n\n" +
  "💙 Vielen Dank für eure Teilnahme!\n\n" +
  "👋 Wir wünschen euch einen schönen Abend und freuen uns,\neuch beim nächsten RP wiederzusehen.\n\n" +
  "{roles}";

/**
 * Ersetzt {servercode} und {roles} in einem konfigurierbaren Ankündigungstext.
 * {roles} wird zu einer Leerzeile, wenn keine Ping-Rollen konfiguriert sind
 * (statt einem hässlichen leeren Platzhalter-Rest im Text).
 */
export function replaceAnnouncementPlaceholders(
  text: string,
  params: { servercode?: string | null; roleMentions: string[] }
): string {
  const servercode = params.servercode?.trim() || "_nicht konfiguriert_";
  const roles = params.roleMentions.length > 0 ? params.roleMentions.join(" ") : "";

  return text.replaceAll("{servercode}", servercode).replaceAll("{roles}", roles).trim();
}

/** Formatiert einen Zeitpunkt als deutsche Uhrzeit, z.B. "18:30 Uhr". */
export function formatGermanTime(date: Date): string {
  return `${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })} Uhr`;
}
