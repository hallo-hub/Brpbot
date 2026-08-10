import fs from "node:fs";
import path from "node:path";
import { BotClient, Command } from "../types";
import { logger } from "../utils/logger";

const SCOPE = "CommandLoader";

/** Prüft grob, ob ein Objekt die Command-Struktur erfüllt. */
function isCommand(candidate: unknown): candidate is Command {
  return (
    !!candidate &&
    typeof candidate === "object" &&
    "data" in candidate &&
    "execute" in candidate &&
    typeof (candidate as Command).execute === "function"
  );
}

/** Sucht rekursiv nach .js/.ts Dateien (ohne .d.ts) in einem Verzeichnis. */
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

/**
 * Lädt alle Commands aus src/commands (Grundkern-Commands wie /dashboard)
 * sowie aus jedem src/modules/<modulname>/commands-Ordner (für später).
 * So kann ein neues Modul einfach seinen eigenen commands-Ordner anlegen,
 * ohne dass dieser Loader angepasst werden muss.
 */
export async function loadCommands(client: BotClient): Promise<void> {
  const commandsDir = path.join(__dirname, "..", "commands");
  const modulesDir = path.join(__dirname, "..", "modules");

  const files = [...findCommandFiles(commandsDir)];

  if (fs.existsSync(modulesDir)) {
    for (const moduleName of fs.readdirSync(modulesDir)) {
      const moduleCommandsDir = path.join(modulesDir, moduleName, "commands");
      files.push(...findCommandFiles(moduleCommandsDir));
    }
  }

  let loaded = 0;

  for (const file of files) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const imported = require(file);
      const command: unknown = imported.default ?? imported.command ?? imported;

      if (!isCommand(command)) {
        logger.warn(SCOPE, `Datei enthält keinen gültigen Command und wird übersprungen: ${file}`);
        continue;
      }

      client.commands.set(command.data.name, command);
      loaded++;
    } catch (error) {
      logger.error(SCOPE, `Fehler beim Laden von Command-Datei: ${file}`, error);
    }
  }

  logger.info(SCOPE, `${loaded} Command(s) geladen.`);
}
