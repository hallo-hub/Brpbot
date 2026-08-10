import { Events } from "discord.js";
import { BotEvent } from "../handlers/loadEvents";
import { logger } from "../utils/logger";

const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info("Ready", `Eingeloggt als ${client.user?.tag ?? "unbekannt"}.`);
    logger.info(
      "Ready",
      `${client.commands.size} Command(s) · ` +
        `${client.buttonHandlers.size + client.buttonPrefixHandlers.length} Button-Handler · ` +
        `${client.selectMenuHandlers.size + client.selectMenuPrefixHandlers.length} Select-Menu-Handler · ` +
        `${client.modalHandlers.size + client.modalPrefixHandlers.length} Modal-Handler bereit.`
    );

    // Später registrierte Module können hier ihre Startup-Logik ausführen
    // (z.B. Caches aufwärmen, geplante Aufgaben starten).
    for (const mod of client.modules) {
      try {
        await mod.onReady?.(client);
      } catch (error) {
        logger.error("Ready", `Fehler beim onReady-Hook von Modul "${mod.name}"`, error);
      }
    }
  },
};

export default event;
