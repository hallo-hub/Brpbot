import { prisma } from "./prisma";
import { ensureGuildSettings } from "./guildSettings";

/**
 * Kernstück der "automatischen Embed-Verwaltung": jedes Modul, das eine
 * dauerhafte Liste/Panel pflegt (Immobilienliste, Fraktionsliste,
 * Regelwerk, Bewerbungspanel, /dashboard-Panel, ...), nutzt diese Funktionen
 * anstatt direkt mit Prisma zu arbeiten.
 *
 * Prinzip:
 *  1. Beim ersten Senden: upsertManagedMessage() aufrufen, sobald die
 *     Nachricht erfolgreich gesendet wurde.
 *  2. Bei jeder Änderung: getManagedMessage() holen, die Nachricht per
 *     channel.messages.edit() aktualisieren. Existiert sie nicht mehr
 *     (z.B. manuell gelöscht), neu senden und erneut upserten.
 *
 * So entstehen nie doppelte Listen/Panels.
 */

export interface ManagedMessageRef {
  guildId: string;
  channelId: string;
  messageId: string;
  type: string;
  key: string | null;
}

/** Holt die gespeicherte Referenz einer dauerhaften Nachricht, falls vorhanden. */
export async function getManagedMessage(
  guildId: string,
  type: string,
  key?: string
): Promise<ManagedMessageRef | null> {
  const entry = await prisma.managedMessage.findUnique({
    where: {
      guildId_type_key: {
        guildId,
        type,
        key: key ?? null,
      },
    },
  });

  if (!entry) return null;

  return {
    guildId: entry.guildId,
    channelId: entry.channelId,
    messageId: entry.messageId,
    type: entry.type,
    key: entry.key,
  };
}

/**
 * Legt eine dauerhafte Nachricht an oder aktualisiert die gespeicherte
 * Referenz (z.B. wenn die Nachricht neu gesendet werden musste, weil sie
 * gelöscht wurde).
 */
export async function upsertManagedMessage(params: {
  guildId: string;
  channelId: string;
  messageId: string;
  type: string;
  key?: string;
}): Promise<void> {
  await ensureGuildSettings(params.guildId);

  await prisma.managedMessage.upsert({
    where: {
      guildId_type_key: {
        guildId: params.guildId,
        type: params.type,
        key: params.key ?? null,
      },
    },
    create: {
      guildId: params.guildId,
      channelId: params.channelId,
      messageId: params.messageId,
      type: params.type,
      key: params.key ?? null,
    },
    update: {
      channelId: params.channelId,
      messageId: params.messageId,
    },
  });
}

/** Entfernt die Referenz auf eine dauerhafte Nachricht (z.B. bei Löschung). */
export async function deleteManagedMessage(
  guildId: string,
  type: string,
  key?: string
): Promise<void> {
  await prisma.managedMessage
    .delete({
      where: {
        guildId_type_key: {
          guildId,
          type,
          key: key ?? null,
        },
      },
    })
    .catch(() => {
      // Existierte ohnehin nicht – kein Problem.
    });
}
