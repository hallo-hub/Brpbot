import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, TextChannel } from "discord.js";
import { BotEvent } from "../../../handlers/loadEvents";
import { logger } from "../../../utils/logger";
import { recordEvent } from "../../../utils/eventLog";
import { getOrCreateWelcomeSettings } from "../services/settings";
import { recordLeave } from "../services/records";
import { buildLeaveDmEmbed, buildLeaveEmbed } from "../services/embeds";
import { DEFAULT_LEAVE_DM_TEXT, placeholdersFromLeftUser, replacePlaceholders } from "../services/texts";
import { FEEDBACK_BUTTON_PREFIX } from "../buttons/feedbackButton";

const SCOPE = "Willkommen/Leave";

const event: BotEvent<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,
  async execute(_client, member) {
    const guildId = member.guild.id;
    const displayName = member.displayName ?? member.user.username;
    const userId = member.id;

    try {
      await recordLeave(guildId, userId);

      const settings = await getOrCreateWelcomeSettings(guildId);

      // ---- Leave-Embed im Kanal ------------------------------------------
      if (settings.leaveChannelId) {
        const channel = await member.guild.channels.fetch(settings.leaveChannelId).catch(() => null);

        if (channel instanceof TextChannel) {
          const embed = buildLeaveEmbed(
            { displayName, userId, guildName: member.guild.name },
            settings
          );
          await channel.send({ embeds: [embed] }).catch((error) => {
            logger.error(SCOPE, `Konnte Leave-Embed nicht senden (Guild ${guildId})`, error);
          });
        } else {
          logger.warn(SCOPE, `Konfigurierter Leave-Kanal (${settings.leaveChannelId}) nicht erreichbar.`);
        }
      }

      // ---- Leave-DM (fehlertolerant) ---------------------------------------
      if (settings.leaveDmEnabled) {
        const dmText = replacePlaceholders(
          settings.leaveDmText ?? DEFAULT_LEAVE_DM_TEXT,
          placeholdersFromLeftUser({ displayName }, member.guild.name)
        );
        const dmEmbed = buildLeaveDmEmbed(dmText);

        // guildId wird in die customId codiert, da eine DM keinen Guild-Kontext
        // mehr besitzt, sobald der User den Server verlassen hat.
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`${FEEDBACK_BUTTON_PREFIX}${guildId}`)
            .setLabel("Feedback geben")
            .setEmoji("📝")
            .setStyle(ButtonStyle.Secondary)
        );

        await member.user
          .send({ embeds: [dmEmbed], components: [row] })
          .catch(() => {
            // DMs deaktiviert o.ä. -> bewusst keine Fehlermeldung, Event läuft normal weiter.
            logger.debug(SCOPE, `Leave-DM an ${userId} konnte nicht zugestellt werden.`);
          });
      }

      await recordEvent({
        guildId,
        category: "member_leave",
        targetId: userId,
        data: { username: member.user.tag },
      });
    } catch (error) {
      logger.error(SCOPE, `Unerwarteter Fehler beim Leave-Event (Guild ${guildId}, User ${userId})`, error);
    }
  },
};

export default event;
