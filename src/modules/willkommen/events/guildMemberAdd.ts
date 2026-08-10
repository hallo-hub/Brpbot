import { Events, TextChannel } from "discord.js";
import { BotEvent } from "../../../handlers/loadEvents";
import { logger } from "../../../utils/logger";
import { recordEvent } from "../../../utils/eventLog";
import { getOrCreateWelcomeSettings } from "../services/settings";
import { recordJoin } from "../services/records";
import { buildJoinDmEmbed, buildJoinEmbed } from "../services/embeds";
import { DEFAULT_WELCOME_DM_TEXT, placeholdersFromMember, replacePlaceholders } from "../services/texts";

const SCOPE = "Willkommen/Join";

const event: BotEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  async execute(_client, member) {
    const guildId = member.guild.id;

    try {
      await recordJoin(guildId, member.id);

      const settings = await getOrCreateWelcomeSettings(guildId);

      // ---- Willkommens-Embed im Kanal -----------------------------------
      if (settings.welcomeChannelId) {
        const channel = await member.guild.channels.fetch(settings.welcomeChannelId).catch(() => null);

        if (channel instanceof TextChannel) {
          const embed = buildJoinEmbed(member, settings);
          await channel.send({ content: `${member}`, embeds: [embed] }).catch((error) => {
            logger.error(SCOPE, `Konnte Willkommens-Embed nicht senden (Guild ${guildId})`, error);
          });
        } else {
          logger.warn(SCOPE, `Konfigurierter Willkommen-Kanal (${settings.welcomeChannelId}) nicht erreichbar.`);
        }
      }

      // ---- Willkommens-DM (fehlertolerant) --------------------------------
      if (settings.joinDmEnabled) {
        const dmText = replacePlaceholders(
          settings.welcomeDmText ?? DEFAULT_WELCOME_DM_TEXT,
          placeholdersFromMember(member, member.guild.name)
        );
        const dmEmbed = buildJoinDmEmbed(dmText, member.guild.name);

        await member
          .send({ embeds: [dmEmbed] })
          .catch(() => {
            // DMs deaktiviert o.ä. -> bewusst keine Fehlermeldung, Event läuft normal weiter.
            logger.debug(SCOPE, `Willkommens-DM an ${member.id} konnte nicht zugestellt werden.`);
          });
      }

      await recordEvent({
        guildId,
        category: "member_join",
        targetId: member.id,
        data: { username: member.user.tag },
      });
    } catch (error) {
      logger.error(SCOPE, `Unerwarteter Fehler beim Join-Event (Guild ${guildId}, User ${member.id})`, error);
    }
  },
};

export default event;
