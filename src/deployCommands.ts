import { REST, Routes } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config/env";
import { logger } from "./utils/logger";

/**
 * Registriert alle Slash Commands aus src/commands und src/modules/*\/commands
 * bei Discord (Guild-Commands – erscheinen sofort, im Gegensatz zu globalen
 * Commands, die bis zu 1h zum Ausrollen brauchen).
 */

function findCommandFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findCommandFiles(fullPath));
    } else if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function registerCommands(): Promise<number> {
  const commandsDir = path.join(__dirname, "commands");
  const modulesDir = path.join(__dirname, "modules");

  const files = [...findCommandFiles(commandsDir)];

  if (fs.existsSync(modulesDir)) {
    for (const moduleName of fs.readdirSync(modulesDir)) {
      files.push(...findCommandFiles(path.join(modulesDir, moduleName, "commands")));
    }
  }

  const body: unknown[] = [];

  for (const file of files) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const imported = require(file);
      const command = imported.default ?? imported.command ?? imported;
      if (command?.data?.toJSON) {
        body.push(command.data.toJSON());
      }
    } catch (error) {
      logger.error("DeployCommands", `Konnte Command-Datei nicht laden: ${file}`, error);
    }
  }

  const rest = new REST().setToken(config.discord.token);

  logger.info("DeployCommands", `Registriere ${body.length} Command(s) für Guild ${config.discord.guildId} ...`);

  await rest.put(Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId), {
    body,
  });

  logger.info("DeployCommands", "Commands erfolgreich registriert.");
  return body.length;
}

async function main() {
  await registerCommands();
}

if (require.main === module) {
  main().catch((error) => {
    logger.error("DeployCommands", "Fehler beim Registrieren der Commands", error);
    process.exit(1);
  });
}
