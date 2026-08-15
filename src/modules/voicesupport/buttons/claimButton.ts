import { ButtonInteraction } from "discord.js";
import { ButtonHandler } from "../../../types";
import { buildEmbed } from "../../../utils/embeds";
import { logger } from "../../../utils/logger";
import { recordEvent } from "../../../utils/eventLog";
import { getSessionById, claimSession } from "../services/session";
import { getOrCreateVoiceSupportSettings, memberHasAnyRole, resolveClaimRoleIds } from "../services/settings";
import { stopWaitingMusic } from "../services/musicPlayer";
import { updateSessionMessage } from "../services/pingMessage";
import { CLAIM_BUTTON_PREFIX } from "../services/embeds";

const SCOPE = "VoiceSupport/Claim";

const handler: ButtonHandler = {
  customId: CLAIM_BUTTON_PREFIX,
  isPrefix: true,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId || !interaction.guild) return;

    const sessionId = interaction.customId.slice(CLAIM_BUTTON_PREFIX.length);
    const session = await getSessionById(sessionId);

    if (!session || session.status !== "WAITING") {
      await interaction.reply({
        embeds: [buildEmbed.error("❌ Nicht mehr verfügbar", "Dieser Fall wurde bereits übernommen oder existiert nicht mehr.")],
        ephemeral: true,
      });
      return;
    }

    const settings = await getOrCreateVoiceSupportSettings(interaction.guildId);
    const claimRoleIds = resolveClaimRoleIds(settings);
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !memberHasAnyRole(member, claimRoleIds)) {
      await interaction.reply({
        embeds: [buildEmbed.error("🚫 Keine Berechtigung", "Du hast keine Berechtigung, Voice-Support-Fälle zu übernehmen.")],
        ephemeral: true,
      });
      return;
    }

    if (!member.voice.channelId) {
      await interaction.reply({
        embeds: [
          buildEmbed.error(
            "❌ Du bist in keinem Voice-Channel",
            "Discord erlaubt es dem Bot nur, dich zwischen Voice-Channeln zu verschieben. " +
              "Bitte tritt zuerst irgendeinem Voice-Channel bei und klicke dann erneut auf **Übernehmen**."
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const claimed = await claimSession(session.id, interaction.user.id);

    await member.voice.setChannel(session.channelId).catch((error) => {
      logger.error(SCOPE, `Konnte Supporter nicht in den Voice-Channel verschieben (Fall ${session.id})`, error);
    });

    stopWaitingMusic(interaction.guildId);
    await updateSessionMessage(interaction.client, claimed);

    await recordEvent({
      guildId: interaction.guildId,
      category: "voicesupport_uebernommen",
      executorId: interaction.user.id,
      targetId: session.userId,
    });

    await interaction.reply({
      embeds: [buildEmbed.success("✅ Übernommen", `Du wurdest zu <#${session.channelId}> verschoben.`)],
      ephemeral: true,
    });
  },
};

export default handler;
