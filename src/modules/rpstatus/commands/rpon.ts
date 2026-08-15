import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from "discord.js";
import { RpStatusValue } from "@prisma/client";
import { Command, PermissionLevel } from "../../../types";
import { buildEmbed } from "../../../utils/embeds";
import { recordEvent } from "../../../utils/eventLog";
import { logger } from "../../../utils/logger";
import { getOrCreateRpStatus, setRpOpen } from "../services/status";
import { getOrCreateRpSettings, parsePingRoleIds } from "../services/settings";
import { syncStatusMessage } from "../services/statusMessage";
import { buildAnnouncementEmbed } from "../services/embeds";
import { DEFAULT_RP_START_TEXT, replaceAnnouncementPlaceholders } from "../services/texts";

const SCOPE = "RpStatus/rpon";

const command: Command = {
  data: new SlashCommandBuilder().setName("rpon").setDescription("Startet das RP auf BayernRP."),

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

    // 1. Prüfen, ob RP bereits aktiv ist.
    const currentStatus = await getOrCreateRpStatus(guildId);
    if (currentStatus.status === RpStatusValue.OPEN) {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Bereits geöffnet", "RP ist bereits geöffnet.")],
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

    // 2. + 3. Status auf OPEN setzen, Startzeit speichern.
    await setRpOpen(guildId, interaction.user.id);

    // 4. Status-Embed aktualisieren.
    const syncResult = await syncStatusMessage(interaction.client, guildId);
    if (!syncResult.ok) {
      logger.warn(SCOPE, `Status-Embed konnte nicht synchronisiert werden: ${syncResult.reason}`);
    }

    // 5. RP-Start Nachricht senden.
    const roleIds = parsePingRoleIds(settings.pingRoleIds);
    const roleMentions = roleIds.map((id) => `<@&${id}>`);
    const text = replaceAnnouncementPlaceholders(settings.rpStartText ?? DEFAULT_RP_START_TEXT, {
      servercode: settings.servercode,
      roleMentions,
    });

    await announcementChannel.send({
      embeds: [buildAnnouncementEmbed(text, settings, true)],
      allowedMentions: { roles: roleIds },
    });

    await recordEvent({
      guildId,
      category: "rp_gestartet",
      executorId: interaction.user.id,
    });

    await interaction.reply({
      embeds: [buildEmbed.success("✅ RP gestartet", `Das RP wurde von dir gestartet und in ${announcementChannel} angekündigt.`)],
      ephemeral: true,
    });
  },
};

export default command;
