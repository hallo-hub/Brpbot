import { ButtonInteraction } from "discord.js";
import { ButtonHandler, PermissionLevel } from "../../types";
import { buildEmbed } from "../../utils/embeds";

/**
 * Grundgerüst-Handler für die drei /dashboard-Buttons. Solange kein Modul
 * eigene Inhalte für "Module" registriert, zeigen wir einen Platzhalter.
 * Sobald z.B. das Immobilien-Modul existiert, kann es hier eigene Buttons/
 * Untermenüs ergänzen (siehe modules/immobiliensystem für ein Beispiel,
 * wie ein Modul sich in bestehende Strukturen einklinkt).
 */

const modulesHandler: ButtonHandler = {
  customId: "dashboard_modules",
  permissionLevel: PermissionLevel.Team,
  async execute(interaction: ButtonInteraction) {
    await interaction.reply({
      embeds: [
        buildEmbed.primary(
          "🏠 Module",
          "Aktuell sind noch keine Module mit eigenem Dashboard-Bereich installiert."
        ),
      ],
      ephemeral: true,
    });
  },
};

const settingsHandler: ButtonHandler = {
  customId: "dashboard_settings",
  permissionLevel: PermissionLevel.Admin,
  async execute(interaction: ButtonInteraction) {
    await interaction.reply({
      embeds: [
        buildEmbed.primary(
          "⚙️ Einstellungen",
          "Serverweite Einstellungen werden hier verwaltet, sobald die entsprechenden Module bereitstehen."
        ),
      ],
      ephemeral: true,
    });
  },
};

const statsHandler: ButtonHandler = {
  customId: "dashboard_stats",
  permissionLevel: PermissionLevel.Team,
  async execute(interaction: ButtonInteraction) {
    await interaction.reply({
      embeds: [
        buildEmbed.primary(
          "📊 Statistiken",
          "Es sind noch keine Statistiken verfügbar – Module liefern diese Daten, sobald sie installiert sind."
        ),
      ],
      ephemeral: true,
    });
  },
};

export const dashboardButtonHandlers: ButtonHandler[] = [modulesHandler, settingsHandler, statsHandler];
export default dashboardButtonHandlers;
