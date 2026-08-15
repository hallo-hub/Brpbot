import { StringSelectMenuInteraction } from "discord.js";
import { SelectMenuHandler } from "../../../types";
import { buildEmbed } from "../../../utils/embeds";
import { recordEvent } from "../../../utils/eventLog";
import { getSessionById, handoverSession } from "../services/session";
import { updateSessionMessage } from "../services/pingMessage";
import { HANDOVER_SELECT_CUSTOM_ID } from "../buttons/handoverButton";

const handler: SelectMenuHandler = {
  customId: HANDOVER_SELECT_CUSTOM_ID,
  isPrefix: true,
  async execute(interaction: StringSelectMenuInteraction) {
    if (!interaction.guildId) return;

    const sessionId = interaction.customId.slice(`${HANDOVER_SELECT_CUSTOM_ID}:`.length);
    const session = await getSessionById(sessionId);

    if (!session || session.status !== "CLAIMED" || session.claimedBy !== interaction.user.id) {
      await interaction.update({
        embeds: [buildEmbed.error("❌ Nicht möglich", "Diese Übergabe ist nicht mehr gültig.")],
        components: [],
      });
      return;
    }

    const newSupporterId = interaction.values[0];
    const updated = await handoverSession(session.id, newSupporterId);

    await updateSessionMessage(interaction.client, updated);

    await recordEvent({
      guildId: interaction.guildId,
      category: "voicesupport_uebergeben",
      executorId: interaction.user.id,
      targetId: newSupporterId,
    });

    await interaction.update({
      embeds: [buildEmbed.success("✅ Übergeben", `Der Fall wurde an <@${newSupporterId}> übergeben.`)],
      components: [],
    });
  },
};

export default handler;
