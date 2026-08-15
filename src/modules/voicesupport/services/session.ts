import { VoiceSupportSession, VoiceSupportStatus } from "@prisma/client";
import { prisma } from "../../../database/prisma";
import { ensureGuildSettings } from "../../../database/guildSettings";

/** Findet einen noch offenen (wartenden/übernommenen) Fall für diesen User, falls vorhanden. */
export async function getActiveSessionForUser(
  guildId: string,
  userId: string
): Promise<VoiceSupportSession | null> {
  return prisma.voiceSupportSession.findFirst({
    where: { guildId, userId, status: { in: [VoiceSupportStatus.WAITING, VoiceSupportStatus.CLAIMED] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSessionById(id: string): Promise<VoiceSupportSession | null> {
  return prisma.voiceSupportSession.findUnique({ where: { id } });
}

export async function createSession(params: {
  guildId: string;
  userId: string;
  channelId: string;
}): Promise<VoiceSupportSession> {
  await ensureGuildSettings(params.guildId);

  return prisma.voiceSupportSession.create({
    data: { guildId: params.guildId, userId: params.userId, channelId: params.channelId },
  });
}

export async function attachPingMessage(
  sessionId: string,
  pingChannelId: string,
  pingMessageId: string
): Promise<void> {
  await prisma.voiceSupportSession.update({
    where: { id: sessionId },
    data: { pingChannelId, pingMessageId },
  });
}

export async function claimSession(sessionId: string, supporterId: string): Promise<VoiceSupportSession> {
  return prisma.voiceSupportSession.update({
    where: { id: sessionId },
    data: { status: VoiceSupportStatus.CLAIMED, claimedBy: supporterId, claimedAt: new Date() },
  });
}

/** Übergabe an einen anderen Supporter: bleibt CLAIMED, nur claimedBy wechselt. */
export async function handoverSession(sessionId: string, newSupporterId: string): Promise<VoiceSupportSession> {
  return prisma.voiceSupportSession.update({
    where: { id: sessionId },
    data: { claimedBy: newSupporterId, claimedAt: new Date() },
  });
}

export async function closeSession(sessionId: string, closedBy: string): Promise<VoiceSupportSession> {
  return prisma.voiceSupportSession.update({
    where: { id: sessionId },
    data: { status: VoiceSupportStatus.CLOSED, closedBy, closedAt: new Date() },
  });
}

/** Bricht einen wartenden (noch nicht übernommenen) Fall ab, z.B. weil der User den Warteraum vorzeitig verlässt. */
export async function cancelWaitingSession(sessionId: string): Promise<void> {
  await prisma.voiceSupportSession
    .update({
      where: { id: sessionId },
      data: { status: VoiceSupportStatus.CLOSED, closedAt: new Date() },
    })
    .catch(() => {
      // Session existiert nicht mehr o.ä. -> kein Problem.
    });
}
