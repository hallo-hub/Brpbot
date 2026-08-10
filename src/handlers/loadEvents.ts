import fs from "node:fs";
import path from "node:path";
import { ClientEvents } from "discord.js";
import { BotClient } from "../types";
import { logger } from "../utils/logger";

const SCOPE = "EventLoader";

export interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (client: BotClient, ...args: ClientEvents[K]) => Promise<void> | void;
}

function isBotEvent(candidate: unknown): candidate is BotEvent {
  return (
    !!candidate &&
    typeof candidate === "object" &&
    "name" in candidate &&
    "execute" in candidate &&
    typeof (candidate as BotEvent).execute === "function"
  );
}

function findFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath));
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
 * Lädt alle Event-Dateien aus src/events (Grundkern-Events wie ready/
 * interactionCreate) sowie aus jedem src/modules/<modul>/events-Ordner.
 * So kann z.B. das spätere Logger-Modul einfach eigene Event-Dateien
 * (messageDelete.ts, guildMemberAdd.ts, ...) hinzufügen.
 */
export async function loadEvents(client: BotClient): Promise<void> {
  const eventsDir = path.join(__dirname, "..", "events");
  const modulesDir = path.join(__dirname, "..", "modules");

  const files = [...findFiles(eventsDir)];

  if (fs.existsSync(modulesDir)) {
    for (const moduleName of fs.readdirSync(modulesDir)) {
      files.push(...findFiles(path.join(modulesDir, moduleName, "events")));
    }
  }

  let loaded = 0;

  for (const file of files) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const imported = require(file);
      const event: unknown = imported.default ?? imported.event ?? imported;

      if (!isBotEvent(event)) {
        logger.warn(SCOPE, `Datei enthält kein gültiges Event und wird übersprungen: ${file}`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
      } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
      }

      loaded++;
    } catch (error) {
      logger.error(SCOPE, `Fehler beim Laden von Event-Datei: ${file}`, error);
    }
  }

  logger.info(SCOPE, `${loaded} Event(s) registriert.`);
}
