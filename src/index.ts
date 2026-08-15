import { GatewayIntentBits, Partials } from "discord.js";
import { BotClient } from "./types";
import { config } from "./config/env";
import { logger } from "./utils/logger";
import { registerGlobalErrorHandlers } from "./utils/errorHandler";
import { connectDatabase, disconnectDatabase } from "./database/prisma";
import { loadCommands } from "./handlers/loadCommands";
import { loadEvents } from "./handlers/loadEvents";
import { loadInteractionHandlers } from "./handlers/loadInteractionHandlers";
import { startHealthServer } from "./utils/healthServer";
import { registerCommands } from "./deployCommands";

async function main(): Promise<void> {
  registerGlobalErrorHandlers();

  const client = new BotClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
  });

  // Health-Server SOFORT starten, bevor DB/Discord verbunden sind – so sieht
  // Render (und Instatus) den Port als offen an, auch während des Bootens.
  // Vor dem Login meldet /health noch 503 (discordReady: false).
  startHealthServer(client);

  logger.info("Bootstrap", "Verbinde mit der Datenbank ...");
  await connectDatabase();
  logger.info("Bootstrap", "Datenbankverbindung hergestellt.");

  logger.info("Bootstrap", "Lade Commands ...");
  await loadCommands(client);

  logger.info("Bootstrap", "Registriere Slash-Commands bei Discord ...");
  await registerCommands();

  logger.info("Bootstrap", "Lade Interaktions-Handler (Buttons/Select-Menus/Modals) ...");
  await loadInteractionHandlers(client);

  logger.info("Bootstrap", "Lade Events ...");
  await loadEvents(client);

  const shutdown = async (signal: string) => {
    logger.info("Bootstrap", `${signal} empfangen, fahre Bot herunter ...`);
    try {
      client.destroy();
      await disconnectDatabase();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await client.login(config.discord.token);
}

main().catch((error) => {
  logger.error("Bootstrap", "Fataler Fehler beim Start des Bots", error);
  process.exit(1);
});
