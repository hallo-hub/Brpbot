/**
 * Einfacher, einheitlicher Konsolen-Logger für den gesamten Bot.
 * Getrennt von der Datenbank-Logging-Grundlage (src/database + LogEntry-
 * Tabelle), die für serverseitige Event-Logs (Modul "Logger") gedacht ist.
 * Dieser Logger ist für Betriebs-/Debug-Ausgaben in der Konsole (Railway
 * Logs) zuständig.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: LogLevel, scope: string, message: string, meta?: unknown): void {
  const prefix = `[${timestamp()}] [${level.toUpperCase()}] [${scope}]`;
  const line = `${prefix} ${message}`;

  switch (level) {
    case "error":
      console.error(line, meta ?? "");
      break;
    case "warn":
      console.warn(line, meta ?? "");
      break;
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.debug(line, meta ?? "");
      }
      break;
    case "info":
    default:
      console.log(line, meta ?? "");
      break;
  }
}

export const logger = {
  info: (scope: string, message: string, meta?: unknown) => write("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: unknown) => write("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: unknown) => write("error", scope, message, meta),
  debug: (scope: string, message: string, meta?: unknown) => write("debug", scope, message, meta),
};
