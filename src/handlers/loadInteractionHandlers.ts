import fs from "node:fs";
import path from "node:path";
import { BotClient, ButtonHandler, ModalHandler, SelectMenuHandler } from "../types";
import { logger } from "../utils/logger";

const SCOPE = "InteractionHandlerLoader";

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

function isHandlerLike(v: unknown): v is { customId: string; execute: unknown } {
  return !!v && typeof v === "object" && "customId" in v && typeof (v as any).execute === "function";
}

/**
 * Lädt eine Handler-Datei und gibt IMMER ein Array zurück – egal ob die
 * Datei einen einzelnen Handler (export default {...}) oder mehrere
 * (export default [...]) exportiert. So können z.B. die drei Dashboard-
 * Grundbuttons in einer gemeinsamen Datei liegen, während ein Modul wie
 * das Immobilien-System pro Handler eine eigene Datei nutzen kann.
 */
function loadExports<T extends { customId: string }>(
  file: string,
  validate: (v: unknown) => v is T
): T[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imported = require(file);
    const candidate: unknown = imported.default ?? imported.handler ?? imported.handlers ?? imported;

    const list = Array.isArray(candidate) ? candidate : [candidate];
    const valid: T[] = [];

    for (const item of list) {
      if (validate(item)) {
        valid.push(item);
      } else {
        logger.warn(SCOPE, `Ungültiger Handler-Export in ${file}, wird übersprungen.`);
      }
    }

    if (valid.length === 0) {
      logger.warn(SCOPE, `Keine gültigen Handler in Datei gefunden: ${file}`);
    }

    return valid;
  } catch (error) {
    logger.error(SCOPE, `Fehler beim Laden von Handler-Datei: ${file}`, error);
    return [];
  }
}

function isButtonHandler(v: unknown): v is ButtonHandler {
  return isHandlerLike(v);
}

function isSelectMenuHandler(v: unknown): v is SelectMenuHandler {
  return isHandlerLike(v);
}

function isModalHandler(v: unknown): v is ModalHandler {
  return isHandlerLike(v);
}

/**
 * Sammelt für einen bestimmten Interaktionstyp ("buttons" | "selectMenus" |
 * "modals") alle passenden Dateien aus dem Grundkern-Ordner (z.B.
 * src/dashboard/buttons) sowie aus jedem src/modules/<modul>/<subfolder>.
 */
function collectFiles(subfolder: string, coreDirs: string[]): string[] {
  const modulesDir = path.join(__dirname, "..", "modules");
  const files: string[] = [];

  for (const coreDir of coreDirs) {
    files.push(...findFiles(coreDir));
  }

  if (fs.existsSync(modulesDir)) {
    for (const moduleName of fs.readdirSync(modulesDir)) {
      files.push(...findFiles(path.join(modulesDir, moduleName, subfolder)));
    }
  }

  return files;
}

export async function loadInteractionHandlers(client: BotClient): Promise<void> {
  // Buttons
  const buttonFiles = collectFiles("buttons", [path.join(__dirname, "..", "dashboard", "buttons")]);
  let buttonCount = 0;
  for (const file of buttonFiles) {
    for (const handler of loadExports<ButtonHandler>(file, isButtonHandler)) {
      if (handler.isPrefix) {
        client.buttonPrefixHandlers.push(handler);
      } else {
        client.buttonHandlers.set(handler.customId, handler);
      }
      buttonCount++;
    }
  }

  // Select Menus
  const selectMenuFiles = collectFiles("selectMenus", [path.join(__dirname, "..", "dashboard", "selectMenus")]);
  let selectMenuCount = 0;
  for (const file of selectMenuFiles) {
    for (const handler of loadExports<SelectMenuHandler>(file, isSelectMenuHandler)) {
      if (handler.isPrefix) {
        client.selectMenuPrefixHandlers.push(handler);
      } else {
        client.selectMenuHandlers.set(handler.customId, handler);
      }
      selectMenuCount++;
    }
  }

  // Modals
  const modalFiles = collectFiles("modals", [path.join(__dirname, "..", "dashboard", "modals")]);
  let modalCount = 0;
  for (const file of modalFiles) {
    for (const handler of loadExports<ModalHandler>(file, isModalHandler)) {
      if (handler.isPrefix) {
        client.modalPrefixHandlers.push(handler);
      } else {
        client.modalHandlers.set(handler.customId, handler);
      }
      modalCount++;
    }
  }

  logger.info(
    SCOPE,
    `${buttonCount} Button-, ${selectMenuCount} Select-Menu- und ${modalCount} Modal-Handler geladen.`
  );
}
