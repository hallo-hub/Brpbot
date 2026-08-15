import { Events, TextChannel, VoiceChannel, Client } from "discord.js";
import { BotEvent } from "../../../handlers/loadEvents";
import { logger } from "../../../utils/logger";
import { recordEvent } from "../../../utils/eventLog";
import { getOrCreateVoiceSupportSettings, parseIdList } from "../services/settings";
import { getActiveSessionForUser, createSession, attachPingMessage, cancelWaitingSession } from "../services/session";
import { startWaitingMusic, stopWaitingMusic } from "../services/musicPlayer";
import { buildSessionEmbed, buildSessionRow } from "../services/embeds";

const SCOPE = "VoiceSupport/VoiceState";

async function handleJoin(
  client: Client,
  guildId: string,
  userId: string,
  settings: Awaited<ReturnType<typeof getOrCreateVoiceSupportSettings>>
) {
  // Falls der User schon einen offenen Fall hat (z.B. Reconnect), nicht doppelt anlegen.
  const existing = await getActiveSessionForUser(guildId, userId);
  if (existing) return;

  if (!settings.waitingRoomChannelId) return;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const waitingRoom = await guild.channels.fetch(settings.waitingRoomChannelId).catch(() => null);
  if (!waitingRoom || !(waitingRoom instanceof VoiceChannel)) {
    logger.warn(SCOPE, `Konfigurierter Warteraum (${settings.waitingRoomChannelId}) ist kein gültiger Voice-Channel.`);
    return;
  }

  const session = await createSession({ guildId, userId, channelId: waitingRoom.id });

  // Die Musik ist optional: Ein FFmpeg-/Voice-Fehler darf nicht verhindern,
  // dass der Fall angelegt und das Support-Team gepingt wird.
  try {
    await startWaitingMusic(waitingRoom);
  } catch (error) {
    logger.error(SCOPE, `Wartemusik konnte nicht gestartet werden (Guild ${guildId})`, error);
  }

  // Team pingen, falls ein Ping-Kanal konfiguriert ist.
  if (settings.pingChannelId) {
    const pingChannel = await guild.channels.fetch(settings.pingChannelId).catch(() => null);

    if (pingChannel instanceof TextChannel) {
      const roleIds = parseIdList(settings.pingRoleIds);
      const pingContent = roleIds.length > 0 ? roleIds.map((id) => `<@&${id}>`).join(" ") : undefined;

      const row = buildSessionRow(session);
      const message = await pingChannel
        .send({
          content: pingContent,
          embeds: [buildSessionEmbed(session)],
          components: row ? [row] : [],
          allowedMentions: { roles: roleIds },
        })
        .catch((error) => {
          logger.error(SCOPE, `Konnte Team nicht pingen (Guild ${guildId})`, error);
          return null;
        });

      if (message) {
        await attachPingMessage(session.id, pingChannel.id, message.id);
      }
    } else {
      logger.warn(SCOPE, `Konfigurierter Ping-Kanal (${settings.pingChannelId}) ist nicht erreichbar.`);
    }
  }

  await recordEvent({ guildId, category: "voicesupport_angefragt", targetId: userId });
}

async function handleLeave(guildId: string, userId: string) {
  const session = await getActiveSessionForUser(guildId, userId);
  if (!session) return;

  // Nur abbrechen, wenn der Fall noch NICHT übernommen wurde. Ein übernommener
  // Fall läuft weiter (der User wurde ja evtl. gerade erst vom Supporter dazu
  // geholt/bewegt) und wird ausschließlich über den "Fall schließen"-Button beendet.
  if (session.status !== "WAITING") return;

  await cancelWaitingSession(session.id);
  stopWaitingMusic(guildId);
}

const event: BotEvent<Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const guildId = (newState.guild ?? oldState.guild).id;
    const settings = await getOrCreateVoiceSupportSettings(guildId);

    if (!settings.waitingRoomChannelId) return;

    const joinedWaitingRoom =
      newState.channelId === settings.waitingRoomChannelId && oldState.channelId !== settings.waitingRoomChannelId;

    const leftWaitingRoom =
      oldState.channelId === settings.waitingRoomChannelId && newState.channelId !== settings.waitingRoomChannelId;

    try {
      if (joinedWaitingRoom) {
        await handleJoin(client, guildId, member.id, settings);
      } else if (leftWaitingRoom) {
        await handleLeave(guildId, member.id);
      }
    } catch (error) {
      logger.error(SCOPE, `Unerwarteter Fehler im Voice-Support-Event (Guild ${guildId}, User ${member.id})`, error);
    }
  },
};

export default event;
