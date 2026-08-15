import { TeamListEntry } from "@prisma/client";
import { prisma } from "../../../database/prisma";
import { ensureGuildSettings } from "../../../database/guildSettings";

export async function listEntries(guildId: string): Promise<TeamListEntry[]> {
  return prisma.teamListEntry.findMany({ where: { guildId }, orderBy: { position: "asc" } });
}

export async function addEntry(guildId: string, roleId: string, label?: string): Promise<TeamListEntry | null> {
  await ensureGuildSettings(guildId);

  const existing = await prisma.teamListEntry.findUnique({ where: { guildId_roleId: { guildId, roleId } } });
  if (existing) return null; // Bereits vorhanden -> nicht doppelt anlegen.

  const highest = await prisma.teamListEntry.findFirst({ where: { guildId }, orderBy: { position: "desc" } });
  const position = (highest?.position ?? -1) + 1;

  return prisma.teamListEntry.create({ data: { guildId, roleId, position, label: label ?? null } });
}

export async function removeEntry(guildId: string, roleId: string): Promise<boolean> {
  const result = await prisma.teamListEntry
    .delete({ where: { guildId_roleId: { guildId, roleId } } })
    .catch(() => null);
  return result !== null;
}

/** Vertauscht die Position einer Rolle mit ihrem Nachbarn (Reihenfolge ändern). */
export async function moveEntry(guildId: string, roleId: string, direction: "up" | "down"): Promise<boolean> {
  const entries = await listEntries(guildId);
  const index = entries.findIndex((e) => e.roleId === roleId);
  if (index === -1) return false;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= entries.length) return false;

  const current = entries[index];
  const target = entries[targetIndex];

  await prisma.$transaction([
    prisma.teamListEntry.update({ where: { id: current.id }, data: { position: target.position } }),
    prisma.teamListEntry.update({ where: { id: target.id }, data: { position: current.position } }),
  ]);

  return true;
}
