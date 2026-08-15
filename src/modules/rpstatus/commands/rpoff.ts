import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from "discord.js";
import { RpStatusValue } from "@prisma/client";
import { Command, PermissionLevel } from "../../../types";
import { buildEmbed } from "../../../utils/embeds";
import { recordEvent } from "../../../utils/eventLog";
import { logger } from "../../../utils/logger";
import { getOrCreateRpStatus, setRpClosed } from "../services/status";
import { getOrCreateRpSettings, parsePingRoleIds } from "../services/settings";
import { syncStatusMessage } from "../services/statusMessage";
import { buildAnnouncementEmbed } from "../services/embeds";
import { DEFAULT_RP_STOP_TEXT, replaceAnnouncementPlaceholders } from "../services/texts";

const SCOPE = "RpStatus/rpoff";

const command: Command = {
  data: new SlashCommandBuilder().setName("rpoff").setDescription("Beendet das RP auf BayernRP."),

  permissionLevel: PermissionLevel.Team,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Fehler", "Dieser Command funktioniert nur auf einem Server.")],
        ephemeral: true,
      });
      return;
    }

    const guildId = interaction.guildId;

    // 1. Prüfen, ob RP aktiv ist.
    const currentStatus = await getOrCreateRpStatus(guildId);
    if (currentStatus.status === RpStatusValue.CLOSED) {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Bereits geschlossen", "RP ist bereits geschlossen.")],
        ephemeral: true,
      });
      return;
    }

    const settings = await getOrCreateRpSettings(guildId);

    if (!settings.announcementChannelId) {
      await interaction.reply({
        embeds: [
          buildEmbed.error(
            "❌ Kein Ankündigungs-Kanal",
            "Es ist noch kein Ankündigungs-Kanal konfiguriert. Nutze `/rp-status einstellungen`."
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const announcementChannel = await interaction.guild.channels
      .fetch(settings.announcementChannelId)
      .catch(() => null);

    if (!announcementChannel || !(announcementChannel instanceof TextChannel)) {
      await interaction.reply({
        embeds: [
          buildEmbed.error(
            "❌ Ankündigungs-Kanal nicht erreichbar",
            `Der konfigurierte Kanal (<#${settings.announcementChannelId}>) ist nicht erreichbar.`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    // 2. + 3. Status auf CLOSED setzen, Endzeit speichern.
    await setRpClosed(guildId, interaction.user.id);

    // 4. Status-Embed aktualisieren.
    const syncResult = await syncStatusMessage(interaction.client, guildId);
    if (!syncResult.ok) {
      logger.warn(SCOPE, `Status-Embed konnte nicht synchronisiert werden: ${syncResult.reason}`);
    }

    // 5. RP-Stop Nachricht senden.
    const roleIds = parsePingRoleIds(settings.pingRoleIds);
    const roleMentions = roleIds.map((id) => `<@&${id}>`);
    const text = replaceAnnouncementPlaceholders(settings.rpStopText ?? DEFAULT_RP_STOP_TEXT, {
      servercode: settings.servercode,
      roleMentions,
    });

    await announcementChannel.send({
      embeds: [buildAnnouncementEmbed(text, settings, false)],
      allowedMentions: { roles: roleIds },
    });

    await recordEvent({
      guildId,
      category: "rp_beendet",
      executorId: interaction.user.id,
    });

    await interaction.reply({
      embeds: [buildEmbed.success("✅ RP beendet", `Das RP wurde von dir beendet und in ${announcementChannel} angekündigt.`)],
      ephemeral: true,
    });
  },
};

export default command;
