import http from "node:http";
import { BotClient } from "../types";
import { config } from "../config/env";
import { logger } from "./logger";

const SCOPE = "HealthServer";

/**
 * Startet einen minimalen HTTP-Server für Health-Checks (z.B. Instatus,
 * UptimeRobot, Render selbst). Render (und ähnliche Web-Service-Hoster)
 * erwarten einen offenen Port – ohne diesen Server würde der Dienst als
 * "nicht erreichbar" gelten, obwohl der Discord-Bot läuft.
 *
 * Antwortet auf GET / und GET /health mit dem aktuellen Verbindungsstatus
 * zu Discord (200 = bereit, 503 = startet noch / nicht verbunden).
 */
export function startHealthServer(client: BotClient): void {
  const server = http.createServer((req, res) => {
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "method_not_allowed" }));
      return;
    }

    if (req.url === "/" || req.url === "/health") {
      const ready = client.isReady();

      res.writeHead(ready ? 200 : 503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: ready ? "ok" : "starting",
          discordReady: ready,
          uptimeSeconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  server.on("error", (error) => {
    logger.error(SCOPE, "Fehler im Health-Check-Server", error);
  });

  server.listen(config.server.port, () => {
    logger.info(SCOPE, `Health-Check-Server läuft auf Port ${config.server.port} (/ und /health).`);
  });
}
