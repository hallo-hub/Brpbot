import fs from "node:fs";
import path from "node:path";
import { VoiceChannel } from "discord.js";
import {
  AudioPlayer,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import { logger } from "../../../utils/logger";

const SCOPE = "VoiceSupport/Music";

/** Ordner mit der Wartemusik. Liegt am Projekt-Root (nicht unter dist/), daher relativ zu process.cwd(). */
const MUSIC_DIR = path.join(process.cwd(), "assets", "waiting-music");

interface GuildPlayback {
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: string[];
  queueIndex: number;
}

const playbacks = new Map<string, GuildPlayback>();

function loadTrackFiles(): string[] {
  if (!fs.existsSync(MUSIC_DIR)) {
    logger.warn(SCOPE, `Musik-Ordner nicht gefunden: ${MUSIC_DIR}`);
    return [];
  }

  return fs
    .readdirSync(MUSIC_DIR)
    .filter((file) => /\.(mp3|wav|m4a|ogg)$/i.test(file))
    .map((file) => path.join(MUSIC_DIR, file));
}

/** Fisher-Yates-Shuffle: liefert die Tracks in zufälliger Reihenfolge (nacheinander, nicht wiederholend innerhalb eines Durchlaufs). */
function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function playNextTrack(guildId: string): void {
  const playback = playbacks.get(guildId);
  if (!playback) return;

  if (playback.queueIndex >= playback.queue.length) {
    // Durchlauf beendet -> neu mischen und von vorn beginnen (Endlosschleife).
    playback.queue = shuffle(loadTrackFiles());
    playback.queueIndex = 0;
  }

  const track = playback.queue[playback.queueIndex];
  playback.queueIndex++;

  if (!track) {
    logger.warn(SCOPE, `Keine Wartemusik-Dateien in ${MUSIC_DIR} gefunden.`);
    return;
  }

  const resource = createAudioResource(track);
  playback.player.play(resource);
}

/** Startet die Wartemusik im angegebenen Voice-Channel (tritt bei Bedarf bei). Läuft in Endlosschleife, bis stopWaitingMusic() aufgerufen wird. */
export async function startWaitingMusic(channel: VoiceChannel): Promise<void> {
  if (playbacks.has(channel.guild.id)) {
    // Bereits eine aktive Wiedergabe in dieser Guild -> nichts doppelt starten.
    return;
  }

  const tracks = loadTrackFiles();
  if (tracks.length === 0) {
    logger.warn(SCOPE, "Keine Wartemusik-Dateien vorhanden, Musik wird übersprungen.");
    return;
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
  } catch (error) {
    logger.error(SCOPE, `Konnte Voice-Channel nicht beitreten (Guild ${channel.guild.id})`, error);
    connection.destroy();
    return;
  }

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });

  connection.subscribe(player);

  const playback: GuildPlayback = {
    connection,
    player,
    queue: shuffle(tracks),
    queueIndex: 0,
  };

  playbacks.set(channel.guild.id, playback);

  player.on(AudioPlayerStatus.Idle, () => playNextTrack(channel.guild.id));
  player.on("error", (error) => {
    logger.error(SCOPE, `Fehler beim Abspielen der Wartemusik (Guild ${channel.guild.id})`, error);
    playNextTrack(channel.guild.id);
  });

  playNextTrack(channel.guild.id);
}

/** Stoppt die Wartemusik und verlässt den Voice-Channel wieder (z.B. sobald ein Supporter übernommen hat). */
export function stopWaitingMusic(guildId: string): void {
  const playback = playbacks.get(guildId);
  if (!playback) return;

  playback.player.stop();
  playback.connection.destroy();
  playbacks.delete(guildId);
}

export function isPlayingWaitingMusic(guildId: string): boolean {
  return playbacks.has(guildId);
}
