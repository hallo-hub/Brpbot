import "dotenv/config";

/**
 * Zentrale Stelle, an der ALLE Umgebungsvariablen gelesen und validiert
 * werden. Kein anderer Teil des Bots darf direkt auf process.env zugreifen –
 * so bleiben IDs, Tokens etc. niemals hart im Code, und fehlende Variablen
 * fallen sofort beim Start auf, statt erst zur Laufzeit irgendwo mitten im
 * Code.
 */

interface RequiredEnv {
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  GUILD_ID: string;
  DATABASE_URL: string;
}

interface OptionalEnv {
  ROLE_ADMIN?: string;
  ROLE_HIGH_TEAM?: string;
  ROLE_TEAM?: string;

  CHANNEL_LOGS?: string;
  CHANNEL_ERRORS?: string;

  EMBED_COLOR_PRIMARY?: string;
  EMBED_COLOR_SUCCESS?: string;
  EMBED_COLOR_ERROR?: string;
  EMBED_COLOR_WARNING?: string;
  EMBED_FOOTER_TEXT?: string;
  EMBED_FOOTER_ICON_URL?: string;

  NODE_ENV?: string;
  PORT?: string;
}

function requireEnv(key: keyof RequiredEnv): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[Config] Pflicht-Umgebungsvariable "${key}" fehlt oder ist leer. ` +
        `Bitte in .env bzw. in den Railway-Variablen setzen.`
    );
  }
  return value.trim();
}

function optionalEnv(key: keyof OptionalEnv, fallback?: string): string | undefined {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    return fallback;
  }
  return value.trim();
}

/** Wandelt eine kommagetrennte Liste von IDs in ein sauberes Array um. */
function parseIdList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export interface Config {
  discord: {
    token: string;
    clientId: string;
    guildId: string;
  };
  database: {
    url: string;
  };
  roles: {
    admin: string[];
    highTeam: string[];
    team: string[];
  };
  channels: {
    logs?: string;
    errors?: string;
  };
  embed: {
    colorPrimary: number;
    colorSuccess: number;
    colorError: number;
    colorWarning: number;
    footerText: string;
    footerIconUrl?: string;
  };
  isProduction: boolean;
  server: {
    /** Port für den Health-Check-HTTP-Server. Render setzt PORT automatisch. */
    port: number;
  };
}

function parseHexColor(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value.replace("#", ""), 16);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function buildConfig(): Config {
  return {
    discord: {
      token: requireEnv("DISCORD_TOKEN"),
      clientId: requireEnv("DISCORD_CLIENT_ID"),
      guildId: requireEnv("GUILD_ID"),
    },
    database: {
      url: requireEnv("DATABASE_URL"),
    },
    roles: {
      admin: parseIdList(optionalEnv("ROLE_ADMIN")),
      highTeam: parseIdList(optionalEnv("ROLE_HIGH_TEAM")),
      team: parseIdList(optionalEnv("ROLE_TEAM")),
    },
    channels: {
      logs: optionalEnv("CHANNEL_LOGS"),
      errors: optionalEnv("CHANNEL_ERRORS"),
    },
    embed: {
      colorPrimary: parseHexColor(optionalEnv("EMBED_COLOR_PRIMARY"), 0x2b6cff),
      colorSuccess: parseHexColor(optionalEnv("EMBED_COLOR_SUCCESS"), 0x57f287),
      colorError: parseHexColor(optionalEnv("EMBED_COLOR_ERROR"), 0xed4245),
      colorWarning: parseHexColor(optionalEnv("EMBED_COLOR_WARNING"), 0xfee75c),
      footerText: optionalEnv("EMBED_FOOTER_TEXT", "BayernRP • All-in-One Management")!,
      footerIconUrl: optionalEnv("EMBED_FOOTER_ICON_URL"),
    },
    isProduction: optionalEnv("NODE_ENV", "development") === "production",
    server: {
      port: Number(optionalEnv("PORT", "3000")) || 3000,
    },
  };
}

export const config: Config = buildConfig();
