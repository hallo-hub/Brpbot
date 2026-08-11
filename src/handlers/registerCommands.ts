import { REST, Routes } from "discord.js";
import { BotClient } from "../types";
import { config } from "../config/env";
import { logger } from "../utils/logger";

const SCOPE = "CommandRegistrar";

/**
 * Registriert alle geladenen Slash Commands direkt auf dem
 * konfigurierten Discord-Server.
 *
 * Guild-Commands werden verwendet, damit Änderungen nahezu
 * sofort auf dem Server verfügbar sind.
 */
export async function registerCommands(client: BotClient): Promise<void> {
  const commands = Array.from(client.commands.values()).map((command) =>
    command.data.toJSON()
  );

  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  logger.info(
    SCOPE,
    `Registriere ${commands.length} Slash Command(s) bei Discord ...`
  );

  await rest.put(
    Routes.applicationGuildCommands(
      config.discord.clientId,
      config.discord.guildId
    ),
    { body: commands }
  );

  logger.info(
    SCOPE,
    `${commands.length} Slash Command(s) erfolgreich bei Discord registriert.`
  );
}
