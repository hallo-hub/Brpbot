import { Guild, Role } from "discord.js";
import { Property } from "@prisma/client";
import { prisma } from "../../../database/prisma";
import { logger } from "../../../utils/logger";

const SCOPE = "Immobiliensystem/Roles";

function roleName(property: Property): string {
  return `🏠 Immobilie Nr. ${property.number}`;
}

/**
 * Stellt sicher, dass die Immobilie eine eigene Discord-Rolle besitzt.
 * Existiert bereits eine gespeicherte roleId UND die Rolle ist auf dem
 * Server noch vorhanden, wird sie wiederverwendet. Andernfalls wird genau
 * EINE neue Rolle erstellt und in der Datenbank hinterlegt. So entstehen
 * niemals doppelte Rollen für dieselbe Immobilie.
 */
export async function ensurePropertyRole(guild: Guild, property: Property): Promise<Role> {
  if (property.roleId) {
    const existing = await guild.roles.fetch(property.roleId).catch(() => null);
    if (existing) return existing;

    logger.warn(
      SCOPE,
      `Gespeicherte Rolle (${property.roleId}) für Immobilie Nr. ${property.number} nicht mehr gefunden, erstelle neu.`
    );
  }

  const created = await guild.roles.create({
    name: roleName(property),
    mentionable: false,
    reason: `Immobilien-System: Rolle für Immobilie Nr. ${property.number}`,
  });

  await prisma.property.update({
    where: { id: property.id },
    data: { roleId: created.id },
  });

  return created;
}

/**
 * Übergibt die Immobilien-Rolle an einen neuen Besitzer: entfernt sie beim
 * alten Besitzer (falls vorhanden) und vergibt sie an den neuen. Erstellt
 * die Rolle bei Bedarf einmalig (siehe ensurePropertyRole).
 */
export async function transferPropertyRole(
  guild: Guild,
  property: Property,
  newOwnerId: string
): Promise<void> {
  const role = await ensurePropertyRole(guild, property);

  if (property.ownerId && property.ownerId !== newOwnerId) {
    const oldMember = await guild.members.fetch(property.ownerId).catch(() => null);
    if (oldMember && oldMember.roles.cache.has(role.id)) {
      await oldMember.roles.remove(role, "Immobilien-System: Weiterverkauf").catch((error) => {
        logger.error(SCOPE, `Konnte alte Besitzerrolle nicht entfernen (User ${property.ownerId})`, error);
      });
    }
  }

  const newMember = await guild.members.fetch(newOwnerId).catch(() => null);
  if (newMember) {
    await newMember.roles.add(role, "Immobilien-System: Kauf/Vergabe").catch((error) => {
      logger.error(SCOPE, `Konnte neue Besitzerrolle nicht vergeben (User ${newOwnerId})`, error);
    });
  }
}

/** Entfernt die Immobilien-Rolle vom aktuellen Besitzer (z.B. bei Löschung/Freigabe). */
export async function revokePropertyRole(guild: Guild, property: Property): Promise<void> {
  if (!property.roleId || !property.ownerId) return;

  const role = await guild.roles.fetch(property.roleId).catch(() => null);
  const member = await guild.members.fetch(property.ownerId).catch(() => null);

  if (role && member && member.roles.cache.has(role.id)) {
    await member.roles.remove(role, "Immobilien-System: Freigabe/Löschung").catch((error) => {
      logger.error(SCOPE, `Konnte Rolle nicht entfernen (User ${property.ownerId})`, error);
    });
  }
}

/** Löscht die Discord-Rolle einer Immobilie vollständig (nur bei /immobilie löschen). */
export async function deletePropertyRole(guild: Guild, property: Property): Promise<void> {
  if (!property.roleId) return;

  const role = await guild.roles.fetch(property.roleId).catch(() => null);
  if (role) {
    await role.delete("Immobilien-System: Immobilie gelöscht").catch((error) => {
      logger.error(SCOPE, `Konnte Rolle nicht löschen (${property.roleId})`, error);
    });
  }
}
