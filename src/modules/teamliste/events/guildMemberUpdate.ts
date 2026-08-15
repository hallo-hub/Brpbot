import { Events } from "discord.js";
import { BotEvent } from "../../../handlers/loadEvents";
import { logger } from "../../../utils/logger";
import { listEntries } from "../services/entries";
import { syncTeamList } from "../services/listMessage";

const SCOPE = "TeamListe/MemberUpdate";

const event: BotEvent<Events.GuildMemberUpdate> = {
  name: Events.GuildMemberUpdate,
  async execute(client, oldMember, newMember) {
    const oldRoleIds = new Set(oldMember.roles.cache.keys());
    const newRoleIds = new Set(newMember.roles.cache.keys());

    // Nur reagieren, wenn sich tatsächlich etwas an den Rollen geändert hat.
    const changed =
      oldRoleIds.size !== newRoleIds.size || [...oldRoleIds].some((id) => !newRoleIds.has(id));

    if (!changed) return;

    try {
      const entries = await listEntries(newMember.guild.id);
      if (entries.length === 0) return;

      const relevantRoleIds = new Set(entries.map((e) => e.roleId));
      const isRelevant = [...oldRoleIds, ...newRoleIds].some((id) => relevantRoleIds.has(id));

      if (isRelevant) {
        await syncTeamList(client, newMember.guild.id);
      }
    } catch (error) {
      logger.error(SCOPE, `Konnte Team-Liste nicht automatisch aktualisieren (Guild ${newMember.guild.id})`, error);
    }
  },
};

export default event;
