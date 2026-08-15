import { Events, Interaction } from "discord.js";
import { BotEvent } from "../handlers/loadEvents";
import { BotClient, PermissionLevel } from "../types";
import { logger } from "../utils/logger";
import { handleInteractionError } from "../utils/errorHandler";
import { buildEmbed } from "../utils/embeds";
import { getPermissionLevel, permissionLevelLabel } from "../utils/permissions";

const SCOPE = "InteractionCreate";

/**
 * Prüft die Berechtigung eines Members für einen Handler und antwortet mit
 * einer verständlichen Fehlermeldung, falls sie nicht ausreicht.
 * Gibt true zurück, wenn die Ausführung fortgesetzt werden darf.
 */
async function checkPermission(
  interaction: Interaction,
  required: PermissionLevel | undefined
): Promise<boolean> {
  if (required === undefined || required === PermissionLevel.Everyone) return true;
  if (!interaction.inGuild() || !interaction.member || !("roles" in interaction.member)) {
    return true; // Außerhalb einer Guild gibt es keine Rollenprüfung.
  }

  // interaction.member ist im Guild-Kontext ein vollwertiges GuildMember,
  // discord.js liefert hier je nach Cache-Zustand aber ggf. nur APIInteractionGuildMember.
  const member = interaction.member as any;
  if (typeof member.roles?.cache === "undefined") return true;

  const level = getPermissionLevel(member);
  if (level >= required) return true;

  if ("reply" in interaction) {
    await interaction.reply({
      embeds: [
        buildEmbed.error(
          "🚫 Keine Berechtigung",
          `Du benötigst mindestens die Berechtigungsstufe **${permissionLevelLabel(required)}**, um das zu tun.`
        ),
      ],
      ephemeral: true,
    });
  }

  return false;
}

const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(client: BotClient, interaction: Interaction) {
    try {
      // ---- Slash Commands -------------------------------------------------
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          logger.warn(SCOPE, `Unbekannter Command aufgerufen: ${interaction.commandName}`);
          return;
        }

        if (!(await checkPermission(interaction, command.permissionLevel))) return;

        await command.execute(interaction);
        return;
      }

      // ---- Buttons ----------------------------------------------------------
      if (interaction.isButton()) {
        let handler = client.buttonHandlers.get(interaction.customId);
        if (!handler) {
          handler = client.buttonPrefixHandlers.find((h) => interaction.customId.startsWith(h.customId));
        }
        if (!handler) {
          logger.warn(SCOPE, `Kein Button-Handler für customId gefunden: ${interaction.customId}`);
          return;
        }

        if (!(await checkPermission(interaction, handler.permissionLevel))) return;

        await handler.execute(interaction);
        return;
      }

      // ---- Select Menus -------------------------------------------------
      if (interaction.isStringSelectMenu()) {
        let handler = client.selectMenuHandlers.get(interaction.customId);
        if (!handler) {
          handler = client.selectMenuPrefixHandlers.find((h) => interaction.customId.startsWith(h.customId));
        }
        if (!handler) {
          logger.warn(SCOPE, `Kein Select-Menu-Handler für customId gefunden: ${interaction.customId}`);
          return;
        }

        if (!(await checkPermission(interaction, handler.permissionLevel))) return;

        await handler.execute(interaction);
        return;
      }

      // ---- Modals -------------------------------------------------------
      if (interaction.isModalSubmit()) {
        let handler = client.modalHandlers.get(interaction.customId);
        if (!handler) {
          handler = client.modalPrefixHandlers.find((h) => interaction.customId.startsWith(h.customId));
        }
        if (!handler) {
          logger.warn(SCOPE, `Kein Modal-Handler für customId gefunden: ${interaction.customId}`);
          return;
        }

        if (!(await checkPermission(interaction, handler.permissionLevel))) return;

        await handler.execute(interaction);
        return;
      }
    } catch (error) {
      if (
        interaction.isChatInputCommand() ||
        interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isModalSubmit()
      ) {
        await handleInteractionError(interaction, SCOPE, error);
      } else {
        logger.error(SCOPE, "Unerwarteter Fehler bei nicht-antwortbarer Interaktion", error);
      }
    }
  },
};

export default event;
