import { Events } from "discord.js";
import { BotEvent } from "../../../handlers/loadEvents";
import { logger } from "../../../utils/logger";
import { listEntries } from "../services/entries";
import { syncTeamList } from "../services/listMessage";

const SCOPE = "TeamListe/MemberRemove";

const event: BotEvent<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
    try {
      const entries = await listEntries(member.guild.id);
      if (entries.length === 0) return;

      const relevantRoleIds = new Set(entries.map((e) => e.roleId));
      const hadRelevantRole = member.roles.cache.some((role) => relevantRoleIds.has(role.id));

      if (hadRelevantRole) {
        await syncTeamList(client, member.guild.id);
      }
    } catch (error) {
      logger.error(SCOPE, `Konnte Team-Liste nicht automatisch aktualisieren (Guild ${member.guild.id})`, error);
    }
  },
};

export default event;
