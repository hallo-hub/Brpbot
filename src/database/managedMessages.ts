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
 *
 * Hinweis: "key" ist bewusst ein leerer String ("") statt null, wenn kein
 * spezifischer Schlüssel gebraucht wird - Prisma behandelt nullable Felder
 * in zusammengesetzten @@unique-Indizes je nach Version unterschiedlich
 * streng, ein leerer String vermeidet dieses Problem komplett.
 */

export interface ManagedMessageRef {
  guildId: string;
  channelId: string;
  messageId: string;
  type: string;
  key: string;
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
        key: key ?? "",
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

  const key = params.key ?? "";

  await prisma.managedMessage.upsert({
    where: {
      guildId_type_key: {
        guildId: params.guildId,
        type: params.type,
        key,
      },
    },
    create: {
      guildId: params.guildId,
      channelId: params.channelId,
      messageId: params.messageId,
      type: params.type,
      key,
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
          key: key ?? "",
        },
      },
    })
    .catch(() => {
      // Existierte ohnehin nicht – kein Problem.
    });
}
